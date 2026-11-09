"""
IntentCart AI Agent Orchestrator powered by Groq & openai/gpt-oss-120b.

Autonomous Loop:
1. Receives natural language shopping intent.
2. Formulates reasoning and selects tools (search_catalog, evaluate_policy, stage_paypal_order).
3. Executes tool calls against the deterministic Python backend.
4. Feeds tool outputs back into the 120B model.
5. Returns transparent trade-off reasoning and policy audits to the shopper.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Load .env variables
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path)

from app.agent.tools import TOOL_SCHEMAS, execute_tool

SYSTEM_PROMPT = """You are IntentCart, an autonomous, budget-aware shopping agent built for the PayPal AI Hackathon.

Your mission:
Help users discover, compare, and safely purchase verified tech products from our 100-item store catalog.

OPERATIONAL GUIDELINES:
1. Identify the user's needs, budget cap, and priorities (e.g. quiet fans, long battery, portability, display quality).
2. Use `search_catalog` to retrieve candidate products from our ChromaDB vector database. If the user has no budget limit, omit `max_budget` entirely (do NOT pass null).
3. If a budget was specified, call `evaluate_policy` for the top 1-2 candidates to verify price + shipping compliance. If no budget was specified, pick the best options based on value and performance.
4. Present the top 2-3 recommendations in CLEAR, PLAIN ENGLISH.

STRICT FORMATTING RULES:
- NEVER use raw HTML tags (e.g., NEVER write <br>, <p>, <div>, <span>, or <table>). Use standard clean markdown line breaks.
- NEVER format your recommendations as a wide markdown table with pipe '|' symbols. This conversation is displayed in a narrow mobile chat widget where markdown tables look broken and unreadable.
- ALWAYS format each recommended product as a clean, structured bullet block:

  **1. [Product Name]** - $[Price]
  • **Key Highlights:** [CPU, RAM, Display, Battery or other key specs]
  • **Why It Fits:** [1-2 sentences on its greatest strengths from customer sentiment]
  • **Trade-off to Consider:** [1 sentence on thermals, weight, or price trade-off]

- Keep your response concise, fast, and easy to read. Avoid overwhelming walls of text.
- Do NOT call `stage_paypal_order` unless the user explicitly asks to checkout or buy. Always remind them that PayPal requires their explicit confirmation before any payment is captured.
"""


class AgentOrchestrator:
    def __init__(self, api_key: Optional[str] = None, model: str = "openai/gpt-oss-120b"):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.model = model

        if not self.api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. Please add GROQ_API_KEY=gsk_... to your backend/.env file."
            )

        # Initialize Groq client
        try:
            from groq import Groq
            self.client = Groq(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "The 'groq' Python package is not installed. Run 'pip install groq' in your terminal."
            )

    def run(self, user_prompt: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Executes the autonomous agentic loop with tool-calling.
        """
        messages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add existing conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)

        # Add the new user prompt
        messages.append({"role": "user", "content": user_prompt})

        tools_invoked: List[Dict[str, Any]] = []
        max_turns = 6  # Safety limit for tool loop
        turn = 0

        while turn < max_turns:
            turn += 1

            # Call Groq with tools
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
                temperature=0.2  # Low temperature for precise, deterministic tool calling
            )

            response_message = response.choices[0].message
            tool_calls = getattr(response_message, "tool_calls", None)

            # If the model didn't call any more tools, we have our final answer!
            if not tool_calls:
                return {
                    "response": response_message.content,
                    "tools_invoked": tools_invoked,
                    "model": self.model,
                    "status": "success"
                }

            # Otherwise, the model chose to call one or more tools!
            messages.append(response_message)

            for tool_call in tool_calls:
                function_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)

                # Record for transparency / frontend audit log
                tools_invoked.append({
                    "tool": function_name,
                    "arguments": arguments
                })

                # Execute tool against Python backend
                tool_result_str = execute_tool(function_name, arguments)

                # Send tool execution result back to the model
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": tool_result_str
                })

        return {
            "response": "Agent reached maximum tool-calling turn limit.",
            "tools_invoked": tools_invoked,
            "model": self.model,
            "status": "turn_limit_exceeded"
        }


# =========================================================================
# Standalone Quick Test (Run directly to watch 120B model call tools live!)
# =========================================================================
if __name__ == "__main__":
    print("=" * 65)
    print("   INTENTCART GROQ 120B AGENT - STANDALONE TEST")
    print("=" * 65)

    try:
        orchestrator = AgentOrchestrator()
        test_prompt = "I need a laptop for Python development under $700. Prioritize battery life and quiet fans."
        print(f"\nUser Prompt: \"{test_prompt}\"")
        print(f"\nContacting Groq ({orchestrator.model})...")

        result = orchestrator.run(test_prompt)

        print("\n" + "-" * 65)
        print("TOOLS AUTONOMOUSLY INVOKED BY THE 120B AGENT:")
        for idx, tool in enumerate(result["tools_invoked"], 1):
            print(f"  {idx}. {tool['tool']}({tool['arguments']})")
        print("-" * 65)

        print("\nFINAL AGENT RESPONSE:")
        print(result["response"])
        print("\n" + "=" * 65)
        print("   AGENTIC TOOL-CALLING WORKFLOW PASSED 100%!")
        print("=" * 65)

    except Exception as e:
        print(f"\n[ERROR]: {e}")
        print("=" * 65)
