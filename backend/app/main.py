"""
IntentCart FastAPI Main Application.

Exposes REST APIs connecting:
- Groq Llama-3.3-70B Autonomous Agent (/api/agent/chat)
- Hybrid RAG Search & Policy Inspector (/api/search)
- Deterministic Policy Guardrails
- PayPal Orders API Sandbox & Mock Adapter (/api/paypal/*)
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure root backend directory is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.agent.rag_search import HybridRAGSearch
from app.agent.orchestrator import AgentOrchestrator
from app.services.paypal_service import PayPalService


# =========================================================================
# Initialize FastAPI Application
# =========================================================================
app = FastAPI(
    title="IntentCart API",
    description="Autonomous Shopping Agent with Deterministic Budget Rules & Consent-Based Payments",
    version="1.0.0"
)

# Enable CORS (Cross-Origin Resource Sharing) so React frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reload dotenv to ensure latest .env settings are applied
from dotenv import load_dotenv
load_dotenv(dotenv_path=backend_dir / ".env", override=True)

# Initialize core services
rag_searcher = HybridRAGSearch()
paypal_service = PayPalService()

# Initialize Groq Agent if API key is present
agent_orchestrator: Optional[AgentOrchestrator] = None
try:
    if os.getenv("GROQ_API_KEY"):
        agent_orchestrator = AgentOrchestrator()
except Exception as e:
    print(f"Warning: Could not initialize Groq Agent: {e}")


# =========================================================================
# Pydantic Schemas (Input Data Validation)
# =========================================================================
class SearchRequest(BaseModel):
    prompt: str = Field(..., description="Shopping query describing requirements and budget.")
    override_budget: Optional[float] = Field(None, description="Optional manual budget override.")
    category: Optional[str] = Field(None, description="Optional category filter (e.g. laptop, monitor, audio, keyboard, mouse, desk_tech).")


class AgentChatRequest(BaseModel):
    prompt: str = Field(..., description="User message to the autonomous agent.")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=None, description="Optional previous chat history.")


class CreateOrderRequest(BaseModel):
    item_name: str = Field(..., description="Product title.")
    amount: float = Field(..., gt=0.0, description="Total amount including shipping.")
    currency: str = Field(default="USD", description="Currency code.")
    product_id: Optional[str] = Field(None, description="Catalog product ID.")


class CaptureOrderRequest(BaseModel):
    order_id: str = Field(..., description="PayPal Order ID to capture.")


# =========================================================================
# API Endpoints
# =========================================================================

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend server & external services status."""
    return {
        "status": "online",
        "service": "IntentCart API",
        "groq_agent_enabled": agent_orchestrator is not None,
        "model": "openai/gpt-oss-120b" if agent_orchestrator else None,
        "paypal_mock_mode": paypal_service.use_mock,
        "catalog_size": len(rag_searcher.catalog)
    }


@app.get("/api/catalog", tags=["Catalog"])
def get_catalog(
    category: Optional[str] = None,
    max_budget: Optional[float] = None
):
    """Returns the product inventory, optionally filtered by category and max budget."""
    products = rag_searcher.catalog
    if category and category.lower() != "all":
        products = [p for p in products if p.get("category", "").lower() == category.lower()]
    if max_budget is not None and max_budget > 0:
        products = [p for p in products if (p.get("price", 0.0) + p.get("shipping_fee", 0.0)) <= max_budget]
    return {
        "count": len(products),
        "products": products
    }


@app.post("/api/search", tags=["Agentic Search"])
def search_products(req: SearchRequest):
    """
    Executes Intent Extraction -> Policy Pre-Filtering -> Semantic RAG Ranking -> Trade-off Explanation.
    Returns structured data for frontend product comparison cards and guardrail audit logs.
    """
    if not req.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty."
        )

    result = rag_searcher.search_and_rank(
        prompt=req.prompt,
        category_filter=req.category,
        budget_override=req.override_budget
    )

    return result


@app.post("/api/agent/chat", tags=["Groq Autonomous Agent"])
def chat_with_agent(req: AgentChatRequest):
    """
    Direct conversational interface with the Groq Llama-3.3-70B Agent.
    The agent autonomously decides when to search catalog, check policies, or stage orders.
    """
    if not agent_orchestrator:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Groq Agent is not configured. Please ensure GROQ_API_KEY is set in backend/.env"
        )

    try:
        result = agent_orchestrator.run(
            user_prompt=req.prompt,
            conversation_history=req.conversation_history
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution error: {str(e)}"
        )


@app.post("/api/paypal/create-order", tags=["Payments"])
def create_paypal_order(req: CreateOrderRequest):
    """
    Phase 1 of Payment: Stages order via PayPal Orders v2 API.
    Status will be 'CREATED'. No money moves until explicit capture.
    """
    try:
        order = paypal_service.create_order(
            item_name=req.item_name,
            amount=req.amount,
            currency=req.currency,
            user_intent_id=req.product_id
        )
        return {
            "success": True,
            "order": order
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create PayPal order: {str(e)}"
        )


@app.post("/api/paypal/capture-order", tags=["Payments"])
def capture_paypal_order(req: CaptureOrderRequest):
    """
    Phase 2 of Payment: Executed ONLY after user clicks 'Approve'.
    Captures funds and changes status to 'COMPLETED'. Includes duplicate capture protection.
    """
    try:
        receipt = paypal_service.capture_order(req.order_id)
        return {
            "success": True,
            "receipt": receipt
        }
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(val_err)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to capture payment: {str(e)}"
        )


# =========================================================================
# Local Server Runner
# =========================================================================
if __name__ == "__main__":
    import uvicorn
    print("\nStarting IntentCart FastAPI server on http://127.0.0.1:8000...")
    print("Interactive Swagger Documentation available at http://127.0.0.1:8000/docs\n")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
