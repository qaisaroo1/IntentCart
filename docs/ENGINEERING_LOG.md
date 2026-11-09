# IntentCart - Engineering Decision & Interview Log

This document serves as your technical log. It explains the architecture decisions, trade-offs, and failure modes for every component built in IntentCart. Use this when preparing for hackathon video demos, README writing, or technical job interviews.

---

## Module 1: Catalog Dataset (`catalog.json`)

* **File Location:** `backend/app/data/catalog.json`
* **What it does:** Stores a curated, schema-validated dataset of 18+ tech products (laptops, monitors, keyboards, audio) with technical specifications, pricing, stock status, and customer sentiment reviews.

### Architectural Decisions
1. **Curated vs. Massive Scrape:**
   * *Decision:* Used a structured, domain-specific 18–35 product dataset instead of scraping 50,000 raw pages from Amazon or Hugging Face.
   * *Rationale:* Live scraping introduces rate-limits, missing fields, and unpredictable schema errors during demo time. A clean schema allows deterministic policy evaluation and predictable vector embeddings.
2. **Dual-Purpose Schema:**
   * Each item contains both **numerical specs** (`price`, `shipping_fee`, `ram_gb`, `battery_hours`) for the deterministic Policy Engine, and **unstructured review summaries** (`review_summary`, `pros`, `cons`) for semantic RAG vector search.

### Interview Talking Point
> *"Instead of relying on noisy web scrapes, I engineered a high-precision e-commerce schema that separates deterministic constraints (price, stock, dimensions) from semantic qualities (noise level, battery endurance, thermal comfort). This enables high-accuracy hybrid search without cloud latency."*

---

## Module 2: Deterministic Policy Engine (`policy_engine.py`)

* **File Location:** `backend/app/core/policy_engine.py`
* **What it does:** Intercepts product recommendations and executes strict, deterministic validation rules (Budget Cap, Stock Verification, Shipping Limits, Category Alignment).

### Architectural Decisions
1. **Decoupled AI Reasoning from Financial Enforcement:**
   * *Decision:* Never let the LLM decide if a purchase is valid. All recommendations pass through a pure Python validator before reaching the UI or payment pipeline.
   * *Rationale:* LLMs suffer from boundary hallucination (e.g. recommending a $720 item when told the budget is $700, rationalizing that 'it's close enough'). Deterministic Python code has zero hallucination risk.
2. **Structured Audit Trail (`RuleCheck`):**
   * *Decision:* The engine returns an array of granular rule evaluations (`rule_id`, `rule_name`, `passed`, `message`, `details`) rather than a simple boolean `True/False`.
   * *Rationale:* Transparency. The UI can display a live "Guardrail Inspector" showing judges and users exactly why a product was approved or blocked.

### Interview Talking Point
> *"A critical flaw in naive agentic systems is trusting LLMs with financial limits. In IntentCart, I decoupled reasoning from enforcement: the AI handles discovery, but a deterministic Python policy engine evaluates mathematical invariants. Every decision produces an immutable audit log of passed and failed security constraints."*

---

## Module 3: PayPal Payment Service & The Two-Phase Capture Pattern (`paypal_service.py`)

* **File Location:** `backend/app/services/paypal_service.py`
* **What it does:** Manages the full transaction lifecycle using PayPal's Orders v2 API standard, featuring a seamless Adapter Pattern between local Mock mode and live PayPal Sandbox.

### Architectural Decisions
1. **The Adapter Pattern (Mock vs. Sandbox):**
   * *Decision:* Implemented an internal switch (`use_mock=True/False`) that mirrors PayPal's exact REST API response schemas locally.
   * *Rationale:* PayPal developer account signups are restricted in certain regions (e.g. Pakistan, Turkey). By utilizing the Adapter Pattern, development and local integration testing continue without external network dependencies or sandbox account blockers.
2. **Two-Phase Commit / State Machine:**
   * *Phase 1 (`create_order`):* Stages the intent and reserves the order ID in state `CREATED`. Funds are **never** debited at this step.
   * *Phase 2 (`capture_order`):* Executed **only after** receiving client-side cryptographic/user confirmation. Transitions status to `COMPLETED`.
3. **Idempotency & Duplicate Capture Prevention:**
   * *Decision:* The service tracks order statuses in an in-memory/state store and rejects subsequent capture calls for already `COMPLETED` orders.
   * *Rationale:* Protects users against double charges caused by network retries or repeated button clicks.

### Interview Talking Point
> *"For the payment integration, I strictly followed PayPal's two-phase Orders v2 state machine. The agent can only stage an order via `create_order`. The funds cannot move until explicit user consent triggers the server-side `capture_order` endpoint. I also built an Adapter Pattern that mimics the exact REST contract, enabling offline testing and idempotent duplicate-capture protection."*

---

## Module 4: Hybrid RAG Search & Trade-Off Decision Engine (`rag_search.py`)

* **File Location:** `backend/app/agent/rag_search.py`
* **What it does:** Orchestrates the user journey from natural language to verified product selection:
  1. *Intent Extraction:* Parses unstructured prompts into structured metadata (`max_budget`, `category`, `priorities`).
  2. *Policy Pre-Filtering:* Uses the deterministic `PolicyEngine` to eliminate non-compliant or out-of-budget products.
  3. *Semantic Vector Ranking:* Computes cosine similarity between user priorities and product review text / pros.
  4. *Explainable Decision Synthesis:* Compares candidates and outputs human-readable trade-off reasoning.

### Architectural Decisions & Bug We Solved
1. **Why Hybrid Search (Filter FIRST, Rank SECOND):**
   * *Decision:* Always apply deterministic policy filters **before** computing semantic similarity.
   * *Rationale:* If you rank purely by semantic vectors first, an expensive $1,299 laptop with perfect reviews might rank #1. Filtering first guarantees that only 100% compliant candidates ever compete for semantic ranking.
2. **Bug Faced & Solved (Standalone Script Module Import):**
   * *Bug:* When executing `rag_search.py` directly from PowerShell, Python threw `ModuleNotFoundError: No module named 'app'` because the execution directory was inside the `agent/` subpackage.
   * *Fix:* Programmatically prepended the parent `backend` root to `sys.path`. This ensures the module executes cleanly both as a standalone test script and when imported by FastAPI.

### Interview Talking Point
> *"Traditional e-commerce search relies on exact keyword matching, failing on subjective queries like 'quiet fans for coding'. I implemented Hybrid RAG: a hard metadata filter eliminates items exceeding the user's budget, while a vector cosine similarity model scores customer review texts to surface products matching qualitative preferences. The engine then synthesizes an explainable trade-off comparison between the top pick and runner-up."*

---

## Module 5: FastAPI REST API & End-to-End Test Suite (`main.py` & `test_api.py`)

* **File Location:** `backend/app/main.py` & `backend/test_api.py`
* **What it does:** Unifies the catalog, RAG engine, policy validator, and payment lifecycle into clean REST endpoints with CORS enabled for frontend communication.

### Endpoints Built:
1. `GET /`: Health check & system diagnostics.
2. `GET /api/catalog`: Complete product inventory inspection.
3. `POST /api/search`: Agentic search endpoint returning recommendations, trade-off reasoning, and policy audits.
4. `POST /api/paypal/create-order`: Stages payment order (Status: `CREATED`).
5. `POST /api/paypal/capture-order`: Captures payment upon human approval (Status: `COMPLETED`).
6. `GET /docs`: Automatic interactive Swagger documentation.

### Architectural Decisions & Testing
* **Test Isolation (`TestClient`):**
  * Built an automated test suite (`test_api.py`) simulating the complete shopper journey from initial natural-language prompt through product selection, policy validation, order staging, and finalized payment capture.
* **CORS Configuration:**
  * Enabled `CORSMiddleware` with configurable allowed origins to ensure secure, frictionless communication between the Vite/React frontend and FastAPI backend.

### Interview Talking Point
> *"I designed the backend with a clean separation of concerns using FastAPI. Each architectural layer—semantic retrieval, mathematical policy evaluation, and financial state transitions—is encapsulated behind dedicated REST contracts. I validated the full pipeline using an automated TestClient suite that simulates the exact sequence of an end-user purchase."*

---

## Module 6: Groq 120B Autonomous Agent & Tool Calling (`tools.py` & `orchestrator.py`)

* **File Location:** `backend/app/agent/tools.py` & `backend/app/agent/orchestrator.py`
* **What it does:** Connects the 120B parameter model (`openai/gpt-oss-120b`) hosted on Groq's high-speed LPUs.
* **The Agent Loop:**
  1. The user provides natural language requirements (budget, qualitative needs).
  2. The 120B agent analyzes the prompt and autonomously invokes tools:
     - `search_catalog`: Semantic & keyword candidate retrieval.
     - `evaluate_policy`: Invariant budget and stock verification.
     - `stage_paypal_order`: Staging Orders v2 transactions.
  3. The agent synthesizes tool outputs into transparent trade-off explanations and strict policy verification reports.

### Architectural Decisions
* **Deterministic Guardrails via Function Calling:**
  * The agent does not calculate budgets in its internal neural weights. Instead, it delegates mathematical validation to the deterministic `evaluate_policy` tool, guaranteeing 0% boundary hallucination.
* **Zero-Money Staging Policy:**
  * The agent is prohibited from autonomously executing payments. It can only stage an order (`status: CREATED`), explicitly returning control to the human user for biometric / password consent on PayPal.

## Module 7: ChromaDB Persistent Vector Store & Semantic RAG (`vector_store.py`)

* **File Location:** `backend/app/agent/vector_store.py`
* **Storage Location:** `backend/chroma_db/` (Persistent on-disk vector database)
* **What it does:** 
  1. Ingests the 18 products and generates dense vector embeddings for product descriptions, specs, and customer reviews.
  2. Executes approximate nearest-neighbor (ANN) cosine queries to identify semantically related products even when literal keywords differ (e.g. querying "silent cooling" matches "whisper-quiet fan thermals").
  3. Integrated directly into the Groq 120B Agent's `search_catalog` tool.

### Interview Talking Point
> *"Rather than relying on brittle lexical or SQL LIKE queries, I embedded our product catalog into a persistent ChromaDB vector store. Customer review sentiments, thermal characteristics, and battery metrics are embedded into high-dimensional space. The Groq agent calls this vector store as an external retrieval tool, giving it grounding in empirical customer sentiment before passing candidates to the deterministic policy engine."*





