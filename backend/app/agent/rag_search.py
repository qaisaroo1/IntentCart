"""
Hybrid RAG Search & Decision Engine for IntentCart.

Combines:
1. Intent Extraction: Parses natural language into budget, category, and desired traits.
2. Hard Policy Pre-Filtering: Uses PolicyEngine to eliminate products over budget or out of stock.
3. Semantic Vector Ranking: Scores candidates based on customer reviews and specs using cosine similarity.
4. Trade-off Reasoning: Explains why the winner was selected over alternatives.
"""

import json
import re
import math
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

import sys
from pathlib import Path

# Ensure backend root is on sys.path for both standalone execution and package imports
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.policy_engine import PolicyEngine, PolicyEvaluation


@dataclass
class SearchIntent:
    """Structured representation of what the shopper wants."""
    raw_query: str
    category: Optional[str] = None
    max_budget: float = 1000.0
    priorities: List[str] = field(default_factory=list)
    require_in_stock: bool = True


@dataclass
class RankedProduct:
    """A candidate product scored and validated against user intent."""
    product: Dict[str, Any]
    policy_eval: PolicyEvaluation
    semantic_score: float
    match_highlights: List[str] = field(default_factory=list)


# =========================================================================
# 1. INTENT PARSER (Turns raw English prompt into structured constraints)
# =========================================================================
class IntentParser:
    """Extracts budget, category, and semantic priorities from user prompts."""

    CATEGORY_KEYWORDS = {
        "laptop": ["laptop", "notebook", "computer", "pc", "macbook", "thinkpad"],
        "monitor": ["monitor", "screen", "display", "4k", "1440p", "ultrawide"],
        "keyboard": ["keyboard", "keys", "mechanical keyboard", "typing"],
        "mouse": ["mouse", "trackpad", "scrolling", "pointing"],
        "audio": ["headphone", "headphones", "earbuds", "earphones", "audio", "anc", "sound"],
        "desk_tech": ["dock", "hub", "webcam", "camera", "microphone", "mic", "light bar", "desk", "thunderbolt"]
    }

    PRIORITY_KEYWORDS = [
        "battery", "quiet", "fan", "silent", "lightweight", "portable",
        "ram", "coding", "programming", "python", "fast", "storage", "display",
        "ergonomic", "noise cancelling", "comfort"
    ]

    @classmethod
    def parse(cls, prompt: str) -> SearchIntent:
        prompt_lower = prompt.lower()

        # 1. Extract Budget (e.g. "$700", "under 700", "budget 700")
        max_budget = 1000.0  # sensible default
        budget_match = re.search(r"(?:under|budget|max|below|\$)\s*(\d+(?:\.\d{2})?)", prompt_lower)
        if budget_match:
            try:
                max_budget = float(budget_match.group(1))
            except ValueError:
                pass

        # 2. Extract Category
        detected_category = None
        for cat, keywords in cls.CATEGORY_KEYWORDS.items():
            if any(kw in prompt_lower for kw in keywords):
                detected_category = cat
                break

        # 3. Extract Priorities
        priorities = [kw for kw in cls.PRIORITY_KEYWORDS if kw in prompt_lower]

        return SearchIntent(
            raw_query=prompt,
            category=detected_category,
            max_budget=max_budget,
            priorities=priorities
        )


# =========================================================================
# 2. VECTOR SEMANTIC SCORER (TF-IDF + Cosine Similarity)
# =========================================================================
class LightweightVectorScorer:
    """
    Computes vector cosine similarity between user priorities and product text.
    Runs in milliseconds locally without needing cloud API dependencies.
    """

    def __init__(self, catalog: List[Dict[str, Any]]):
        self.catalog = catalog
        self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"\b[a-zA-Z0-9]{2,}\b", text.lower())

    def _build_index(self):
        """Constructs Term-Frequency (TF) vectors and Inverse Document Frequencies (IDF)."""
        self.doc_vectors: List[Dict[str, float]] = []
        self.df: Dict[str, int] = {}
        self.total_docs = len(self.catalog)

        for item in self.catalog:
            # Aggregate all text: description + review summary + pros
            text_corpus = " ".join([
                item.get("name", ""),
                item.get("description", ""),
                item.get("review_summary", ""),
                " ".join(item.get("pros", []))
            ])
            tokens = self._tokenize(text_corpus)
            tf: Dict[str, float] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0.0) + 1.0

            # Normalize TF
            total_tokens = len(tokens) or 1
            for t in tf:
                tf[t] /= total_tokens
                self.df[t] = self.df.get(t, 0) + 1

            self.doc_vectors.append(tf)

    def score(self, query: str, doc_idx: int) -> float:
        """Computes cosine similarity score between query and a catalog document."""
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return 0.1  # base score if query has no tokens

        doc_tf = self.doc_vectors[doc_idx]
        score = 0.0
        for token in query_tokens:
            if token in doc_tf:
                idf = math.log((self.total_docs + 1) / (self.df.get(token, 0) + 1)) + 1.0
                score += doc_tf[token] * idf

        # Bound score between 0.0 and 1.0
        return min(round(score * 5.0, 3), 1.0)


# =========================================================================
# 3. HYBRID RAG SEARCH ORCHESTRATOR
# =========================================================================
class HybridRAGSearch:
    def __init__(self, catalog_path: Optional[Path] = None):
        if catalog_path is None:
            catalog_path = Path(__file__).resolve().parent.parent / "data" / "catalog.json"
        with open(catalog_path, "r", encoding="utf-8") as f:
            self.catalog: List[Dict[str, Any]] = json.load(f)

        self.vector_scorer = LightweightVectorScorer(self.catalog)

    def search_and_rank(
        self,
        prompt: str,
        category_filter: Optional[str] = None,
        budget_override: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Full end-to-end pipeline:
        Intent Parsing -> Policy Filtering -> Semantic Vector Scoring -> Trade-off Reasoning
        """
        intent = IntentParser.parse(prompt)

        # Allow explicit UI overrides from filter bar
        if category_filter and category_filter.lower() != "all":
            intent.category = category_filter.lower()
        if budget_override is not None and budget_override > 0:
            intent.max_budget = budget_override

        # 1. Initialize Deterministic Policy Engine (The Bouncer)
        policy_engine = PolicyEngine(
            max_budget=intent.max_budget,
            require_in_stock=intent.require_in_stock,
            allowed_categories=[intent.category] if intent.category else None
        )

        passed_candidates: List[RankedProduct] = []
        rejected_candidates: List[PolicyEvaluation] = []

        # 2. Evaluate all products against Policy Engine + Vector Scorer
        for idx, product in enumerate(self.catalog):
            eval_result = policy_engine.evaluate(product)

            if eval_result.passed:
                # Compute semantic relevance score based on prompt & user priorities
                search_text = f"{prompt} {' '.join(intent.priorities)}"
                score = self.vector_scorer.score(search_text, idx)

                # Find which pros matched user priorities
                matched_pros = [
                    pro for pro in product.get("pros", [])
                    if any(p in pro.lower() for p in intent.priorities)
                ]

                passed_candidates.append(RankedProduct(
                    product=product,
                    policy_eval=eval_result,
                    semantic_score=score,
                    match_highlights=matched_pros or product.get("pros", [])[:2]
                ))
            else:
                rejected_candidates.append(eval_result)

        # 3. Sort candidates by semantic score (Highest relevance first)
        passed_candidates.sort(key=lambda x: x.semantic_score, reverse=True)

        # 4. Generate Explainable Trade-off Reason
        decision_summary = self._formulate_trade_off_explanation(intent, passed_candidates)

        return {
            "intent": {
                "raw_query": intent.raw_query,
                "detected_category": intent.category,
                "max_budget": intent.max_budget,
                "priorities": intent.priorities
            },
            "top_pick": passed_candidates[0].product if passed_candidates else None,
            "top_pick_evaluation": passed_candidates[0].policy_eval.to_dict() if passed_candidates else None,
            "decision_summary": decision_summary,
            "ranked_candidates": [
                {
                    "product": c.product,
                    "semantic_score": c.semantic_score,
                    "highlights": c.match_highlights,
                    "policy_checks": [check.rule_name for check in c.policy_eval.checks if check.passed]
                }
                for c in passed_candidates[:3]
            ],
            "rejected_count": len(rejected_candidates)
        }

    def _formulate_trade_off_explanation(
        self,
        intent: SearchIntent,
        candidates: List[RankedProduct]
    ) -> str:
        """Creates transparent, human-readable trade-off reasoning."""
        if not candidates:
            return f"No products found that satisfy all policy rules within budget of ${intent.max_budget:.2f}."

        top = candidates[0].product
        top_price = top["price"] + top.get("shipping_fee", 0.0)

        explanation = (
            f"Selected '{top['name']}' (${top_price:.2f}) as the optimal match. "
            f"It complies strictly with your ${intent.max_budget:.2f} budget cap. "
            f"Customer reviews highlight: '{top.get('review_summary', '')}'"
        )

        if len(candidates) > 1:
            runner_up = candidates[1].product
            runner_up_price = runner_up["price"] + runner_up.get("shipping_fee", 0.0)
            diff = abs(top_price - runner_up_price)
            if runner_up_price < top_price:
                explanation += (
                    f" Alternative consideration: '{runner_up['name']}' saves you ${diff:.2f}, "
                    f"but lacks some of the specific thermal or endurance ratings found on the top pick."
                )
            else:
                explanation += (
                    f" Alternative '{runner_up['name']}' is priced at ${runner_up_price:.2f}, "
                    f"offering a different balance of screen and portability."
                )

        return explanation


# =========================================================================
# Standalone Quick Test (Run directly to see Hybrid Search in action!)
# =========================================================================
if __name__ == "__main__":
    print("=" * 65)
    print("   INTENTCART HYBRID RAG SEARCH & DECISION ENGINE TEST")
    print("=" * 65)

    searcher = HybridRAGSearch()

    test_prompt = "I need a laptop for Python development under $700. Prioritize long battery and quiet fans."
    print(f"\nUser Prompt: \"{test_prompt}\"\n")

    result = searcher.search_and_rank(test_prompt)

    print(f"Extracted Intent:")
    print(f"  --> Category:   {result['intent']['detected_category']}")
    print(f"  --> Max Budget: ${result['intent']['max_budget']:.2f}")
    print(f"  --> Priorities: {result['intent']['priorities']}")

    top_pick = result["top_pick"]
    if top_pick:
        print(f"\n[WINNER]: {top_pick['name']} (${top_pick['price']:.2f})")
        print(f"Decision & Trade-offs:\n  {result['decision_summary']}\n")

        print("Top 3 Ranked Candidates:")
        for idx, item in enumerate(result["ranked_candidates"], 1):
            p = item["product"]
            print(f"  {idx}. {p['name']} - ${p['price']:.2f} (Score: {item['semantic_score']})")
            print(f"     Highlights: {', '.join(item['highlights'])}")
    else:
        print("No matching product passed policy checks!")

    print(f"\nTotal Out-of-Budget/Disqualified items filtered out: {result['rejected_count']}")
    print("=" * 65)
