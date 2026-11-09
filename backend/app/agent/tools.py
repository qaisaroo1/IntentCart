"""
Tool Definitions and Dispatcher for IntentCart Groq Agent.

Provides the 3 core tools that Llama-3.3-70B can autonomously invoke:
1. search_catalog: Semantic and filtered search across the 18 curated products.
2. evaluate_policy: The deterministic "Bouncer" verifying budget and inventory invariants.
3. stage_paypal_order: Stages a PayPal Orders v2 transaction (status CREATED, zero funds debited).
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.policy_engine import PolicyEngine
from app.services.paypal_service import PayPalService
from app.agent.vector_store import vector_store

# Load product catalog helper
CATALOG_PATH = backend_dir / "app" / "data" / "catalog.json"

def get_current_catalog() -> List[Dict[str, Any]]:
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

# Global PayPal service instance
paypal_service = PayPalService()


# =========================================================================
# 1. TOOL IMPLEMENTATIONS (Python functions called by the agent)
# =========================================================================

def search_catalog(
    query: str,
    category: Optional[str] = None,
    max_budget: Optional[float] = None
) -> Dict[str, Any]:
    """
    Searches the product catalog using ChromaDB semantic vector search
    combined with metadata and budget filtering.
    """
    candidates = vector_store.search(
        query=query,
        n_results=4,
        category=category,
        max_budget=max_budget
    )
    return {
        "count": len(candidates),
        "products": candidates,
        "search_engine": "ChromaDB Semantic Vector RAG"
    }


def evaluate_policy(product_id: str, max_budget: float) -> Dict[str, Any]:
    """
    Deterministic Policy Engine verification (The Bouncer).
    Mathematically verifies budget cap, stock status, and shipping threshold.
    """
    catalog = get_current_catalog()
    target = next((item for item in catalog if item["id"] == product_id), None)
    if not target:
        return {"error": f"Product with ID '{product_id}' not found in catalog."}

    engine = PolicyEngine(max_budget=max_budget)
    evaluation = engine.evaluate(target)
    return evaluation.to_dict()


def stage_paypal_order(product_id: str) -> Dict[str, Any]:
    """
    Stages an order with the PayPal Orders v2 API.
    Returns status 'CREATED'. NO money is taken until explicit user confirmation.
    """
    catalog = get_current_catalog()
    target = next((item for item in catalog if item["id"] == product_id), None)
    if not target:
        return {"error": f"Product '{product_id}' not found."}

    total_amount = round(target["price"] + target.get("shipping_fee", 0.0), 2)
    order = paypal_service.create_order(
        item_name=target["name"],
        amount=total_amount,
        currency="USD",
        user_intent_id=product_id
    )
    return {
        "status": "STAGED",
        "order_id": order["id"],
        "order_status": order["status"],
        "amount": f"${total_amount:.2f} USD",
        "product_name": target["name"],
        "message": "Order successfully staged. Awaiting explicit user consent before capture."
    }


# =========================================================================
# 2. TOOL DISPATCHER (Executes tool called by Groq Llama-3)
# =========================================================================

def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> str:
    """Dispatches tool calls to the correct Python function and returns JSON string."""
    try:
        if tool_name == "search_catalog":
            res = search_catalog(
                query=arguments.get("query", ""),
                category=arguments.get("category"),
                max_budget=arguments.get("max_budget")
            )
        elif tool_name == "evaluate_policy":
            res = evaluate_policy(
                product_id=arguments["product_id"],
                max_budget=float(arguments["max_budget"])
            )
        elif tool_name == "stage_paypal_order":
            res = stage_paypal_order(
                product_id=arguments["product_id"]
            )
        else:
            res = {"error": f"Unknown tool: '{tool_name}'"}
    except Exception as e:
        res = {"error": f"Execution error in {tool_name}: {str(e)}"}

    return json.dumps(res)


# =========================================================================
# 3. GROQ / OPENAI COMPLIANT TOOL SCHEMAS
# =========================================================================

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_catalog",
            "description": "Searches the catalog of products based on category, keywords, and budget constraints.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Keywords describing desired features (e.g., 'quiet fans long battery life python')."
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter: laptop, monitor, keyboard, mouse, audio, desk_tech. Omit if searching across all categories."
                    },
                    "max_budget": {
                        "type": "number",
                        "description": "Optional maximum budget ceiling in USD. Do NOT pass null; omit this parameter if budget is unlimited."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "evaluate_policy",
            "description": "The deterministic Bouncer. Validates if a product complies strictly with the user's budget and inventory rules.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "string",
                        "description": "The product ID to evaluate (e.g., 'laptop-001')."
                    },
                    "max_budget": {
                        "type": "number",
                        "description": "The maximum budget to check against."
                    }
                },
                "required": ["product_id", "max_budget"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "stage_paypal_order",
            "description": "Stages a PayPal Orders v2 checkout in status 'CREATED'. Does NOT capture money.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "string",
                        "description": "The ID of the product to stage for checkout."
                    }
                },
                "required": ["product_id"]
            }
        }
    }
]
