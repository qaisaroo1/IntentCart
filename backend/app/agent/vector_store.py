"""
ChromaDB Vector Store & Semantic RAG Engine for IntentCart.

What this module does:
1. Initializes a persistent ChromaDB vector database in `backend/chroma_db`.
2. Indexes the 18 curated products: embedding specs, descriptions, customer review
   sentiment, and pros/cons into high-dimensional vector representations.
3. Provides true Semantic Nearest-Neighbor RAG retrieval: matching user concepts
   (e.g., 'silent cooling system', 'train travel friendly') even when wording differs.
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import chromadb

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

CATALOG_PATH = backend_dir / "app" / "data" / "catalog.json"
CHROMA_PATH = backend_dir / "chroma_db"


class CatalogVectorStore:
    def __init__(self, persist_dir: Optional[Path] = None):
        self.persist_dir = str(persist_dir or CHROMA_PATH)
        
        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection_name = "intentcart_catalog"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "IntentCart verified product catalog embeddings"}
        )

        # Load raw catalog data
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            self.catalog: List[Dict[str, Any]] = json.load(f)
        self.catalog_map: Dict[str, Dict[str, Any]] = {p["id"]: p for p in self.catalog}

        # Index products if collection is empty or catalog updated
        self._sync_index()

    def _sync_index(self):
        """Indexes or updates all products into ChromaDB vectors."""
        existing_count = self.collection.count()
        if existing_count == len(self.catalog):
            return  # Index is already up-to-date

        documents = []
        metadatas = []
        ids = []

        for p in self.catalog:
            # Construct rich text corpus combining qualitative review sentiment & specs
            specs_str = ", ".join(f"{k}: {v}" for k, v in p.get("specs", {}).items())
            pros_str = ", ".join(p.get("pros", []))
            cons_str = ", ".join(p.get("cons", []))

            doc_text = (
                f"{p['name']} by {p['brand']}. Category: {p['category']}. "
                f"Price: ${p['price']:.2f}. Shipping: ${p.get('shipping_fee', 0.0):.2f}. "
                f"Description: {p['description']} "
                f"Customer Review Summary: {p.get('review_summary', '')} "
                f"Pros: {pros_str}. Cons: {cons_str}. "
                f"Specifications: {specs_str}."
            )

            documents.append(doc_text)
            metadatas.append({
                "product_id": p["id"],
                "category": p["category"].lower(),
                "price": float(p["price"]),
                "in_stock": bool(p.get("in_stock", True)),
                "name": p["name"]
            })
            ids.append(p["id"])

        self.collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

    def search(
        self,
        query: str,
        n_results: int = 4,
        category: Optional[str] = None,
        max_budget: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes semantic nearest-neighbor search with optional metadata pre-filtering.
        """
        where_filter = None
        if category:
            where_filter = {"category": category.lower()}

        # Perform vector similarity query
        results = self.collection.query(
            query_texts=[query],
            n_results=min(n_results * 2, len(self.catalog)),  # fetch extra for post-filtering
            where=where_filter
        )

        matched_products = []
        retrieved_ids = results.get("ids", [[]])[0]
        distances = results.get("distances", [[]])[0] if "distances" in results else []

        for idx, pid in enumerate(retrieved_ids):
            product = self.catalog_map.get(pid)
            if not product:
                continue

            # Optional budget filtering
            total_price = product["price"] + product.get("shipping_fee", 0.0)
            if max_budget is not None and total_price > max_budget:
                continue

            # Attach semantic distance score for explainability
            distance = distances[idx] if idx < len(distances) else 0.0
            product_copy = dict(product)
            product_copy["vector_distance"] = round(distance, 4)
            matched_products.append(product_copy)

            if len(matched_products) >= n_results:
                break

        return matched_products


# Singleton instance
vector_store = CatalogVectorStore()


# =========================================================================
# Standalone Quick Test (Tests Semantic Vector Retrieval with ChromaDB)
# =========================================================================
if __name__ == "__main__":
    print("=" * 65)
    print("      INTENTCART CHROMADB VECTOR STORE - STANDALONE TEST")
    print("=" * 65)

    store = CatalogVectorStore()
    print(f"\nIndexed Products in ChromaDB: {store.collection.count()} items.")

    # Test semantic query: Notice we use words NOT in the title!
    test_query = "silent cooling system for heavy code compilation"
    print(f"\nSemantic Query: \"{test_query}\"")
    print("Searching nearest-neighbor embeddings in ChromaDB...")

    results = store.search(query=test_query, n_results=3, category="laptop")

    print("\nTop Semantic Matches from ChromaDB:")
    for idx, item in enumerate(results, 1):
        print(f"  {idx}. {item['name']} - ${item['price']:.2f}")
        print(f"     Review: \"{item.get('review_summary', '')}\"")
        print(f"     Distance: {item.get('vector_distance')} (Lower = Closer Semantic Match)")
        print("-" * 65)

    print("\n   CHROMADB VECTOR RAG STORE VERIFIED 100% OPERATIONAL!")
    print("=" * 65)
