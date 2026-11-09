import os
import sys
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import gradio as gr
from app.main import app as fastapi_app

# Create a clean status dashboard for judges visiting the API root
with gr.Blocks(title="IntentCart Backend API Server") as demo:
    gr.Markdown("# 🛒 IntentCart AI Agent & Payment Backend")
    gr.Markdown(
        """
        ### ✅ FastAPI Engine Status: **ONLINE**
        * **Catalog:** 100 Verified Products Indexed in ChromaDB
        * **API Endpoints:** Live at `/api/catalog`, `/api/search`, `/api/agent/chat`, `/api/paypal/*`
        * **API Docs:** Available at `/docs`
        """
    )

# Mount Gradio dashboard onto FastAPI
# This keeps all FastAPI endpoints active on root, with status page available
app = gr.mount_gradio_app(fastapi_app, demo, path="/status")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
