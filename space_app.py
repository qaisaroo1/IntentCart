import os
# Explicitly disable Gradio 5 Node.js SSR proxy to prevent [Errno 98] port 7860 collision with Uvicorn
os.environ["GRADIO_SSR_MODE"] = "false"

import sys
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# 1. Import spaces FIRST for ZeroGPU environment
try:
    import spaces
    GPU = spaces.GPU
except ImportError:
    def GPU(func=None, **kwargs):
        if func is not None:
            return func
        return lambda f: f

import gradio as gr
import uvicorn

from app.main import app as fastapi_app

# 2. Main handler decorated with @GPU
@GPU
def search_agent_ui(query: str):
    if not query or not query.strip():
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

# 3. Create Gradio interface
demo = gr.Interface(
    fn=search_agent_ui,
    inputs=gr.Textbox(label="IntentCart Natural Language Product Search", placeholder="e.g. Quiet mechanical keyboard under $100"),
    outputs=gr.Markdown(label="AI Agent Top Recommendations"),
    title="🛒 IntentCart AI Agent & Payment API",
    description="Live FastAPI backend endpoints are active at `/api/catalog`, `/api/search`, `/api/agent/chat`, `/api/paypal/*`. Interactive Swagger docs at `/docs`. Health check at `/health`."
)

# Enable queue for ZeroGPU
demo.queue()

# 4. Mount Gradio interface onto FastAPI app at root "/"
try:
    app = gr.mount_gradio_app(fastapi_app, demo, path="/", ssr_mode=False)
except TypeError:
    app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    # Report to ZeroGPU broker to satisfy watchdog before Uvicorn starts
    try:
        from spaces import zero as _spaces_zero
        if hasattr(_spaces_zero, "startup"):
            _spaces_zero.startup()
            print("[App] ZeroGPU startup report sent successfully", flush=True)
    except Exception as error:
        print(f"[App] ZeroGPU startup note: {error!r}", flush=True)

    uvicorn.run(app, host="0.0.0.0", port=7860)
