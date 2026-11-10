import os
import sys
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import gradio as gr
import uvicorn

# Try importing spaces for Hugging Face ZeroGPU validation
try:
    import spaces
    has_spaces = True
except ImportError:
    has_spaces = False

from app.main import app as fastapi_app

def _execute_search(query: str) -> str:
    if not query.strip():
        return "Please enter a search query or product intent (e.g. 'mechanical keyboard under $100')."
    try:
        from app.main import rag_searcher
        results = rag_searcher.search_and_rank(prompt=query)
        candidates = results.get("ranked_candidates", [])
        summary = results.get("decision_summary", "Search completed.")
        matches = [
            f"• {c['product']['name']} (${c['product']['price']}) — {c.get('highlights', ['Recommended'])[0]}"
            for c in candidates[:3]
        ]
        if matches:
            return f"### AI Agent Decision:\n{summary}\n\n### Top Matches:\n" + "\n".join(matches)
        return f"{summary}\n\nNo products found matching strict criteria."
    except Exception as e:
        return f"Agent response: {str(e)}"

# Satisfy Hugging Face ZeroGPU scanner
if has_spaces:
    @spaces.GPU
    def search_agent_ui(query: str):
        return _execute_search(query)
else:
    def search_agent_ui(query: str):
        return _execute_search(query)

# Create Gradio interface with the decorated handler
demo = gr.Interface(
    fn=search_agent_ui,
    inputs=gr.Textbox(label="IntentCart Natural Language Product Search", placeholder="e.g. Quiet mechanical keyboard under $100"),
    outputs=gr.Markdown(label="AI Agent Top Recommendations"),
    title="🛒 IntentCart AI Agent & Payment API",
    description="Live FastAPI backend endpoints are active at `/api/catalog`, `/api/search`, `/api/agent/chat`, `/api/paypal/*`. Interactive Swagger docs at `/docs`. Health check at `/health`."
)

# Mount Gradio interface onto FastAPI app at root "/"
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
