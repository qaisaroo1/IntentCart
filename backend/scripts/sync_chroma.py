import json
from app.agent.vector_store import CatalogVectorStore

print("Re-indexing ChromaDB vector store with updated product names...")
store = CatalogVectorStore()
# Force re-indexing of all 100 items
catalog = store.catalog
documents = []
metadatas = []
ids = []

for p in catalog:
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

store.collection.upsert(
    documents=documents,
    metadatas=metadatas,
    ids=ids
)

print(f"Successfully synced ChromaDB! Total items: {store.collection.count()}")
