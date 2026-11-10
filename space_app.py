import os
import sys
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import gradio as gr

# Try importing spaces for Hugging Face ZeroGPU validation
try:
    import spaces
    has_spaces = True
except ImportError:
    has_spaces = False

from app.main import app as fastapi_app

# The primary handler for Gradio UI that ZeroGPU's AST scanner inspects
if has_spaces:
    @spaces.GPU
    def search_agent_ui(query: str):
        if not query.strip():
            return "Please enter a search query or product intent."
        try:
            from app.main import rag_searcher
            results = rag_searcher.search_and_rank(query, limit=3)
            matches = [f"• {c['product']['name']} (${c['product']['price']})" for c in results.get("candidates", [])]
            return "\n".join(matches) if matches else "No products found within criteria."
        except Exception as e:
            return f"Agent response: {str(e)}"
else:
    def search_agent_ui(query: str):
        return f"Query received: {query}"

# Create Gradio interface with the decorated handler
demo = gr.Interface(
    fn=search_agent_ui,
    inputs=gr.Textbox(label="IntentCart Natural Language Product Search", placeholder="e.g. Quiet mechanical keyboard under $100"),
    outputs=gr.Textbox(label="AI Agent Top Recommendations"),
    title="🛒 IntentCart AI Agent & Payment API",
    description="Live FastAPI backend endpoints are active at `/api/catalog`, `/api/search`, `/api/agent/chat`, `/api/paypal/*`. Interactive Swagger docs at `/docs`."
)

# Mount Gradio interface onto FastAPI app
app = gr.mount_gradio_app(fastapi_app, demo, path="/status")

if __name__ == "__main__":
    demo.launch()
