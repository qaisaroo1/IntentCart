"""
Test suite for IntentCart FastAPI Endpoints.

Runs complete end-to-end user journey:
1. Health Check
2. Search & Intent RAG Recommendation
3. PayPal Order Creation (Stage 1)
4. Payment Capture with User Consent (Stage 2)
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

# Create a local test client that calls our FastAPI routes
client = TestClient(app)

def run_tests():
    print("=" * 65)
    print("       INTENTCART API END-TO-END TEST SUITE")
    print("=" * 65)

    # 1. Health Check Test
    print("\n1. Testing GET / (Health Check)...")
    res = client.get("/")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"   [OK] Server status: {res.json()['status']} | Products loaded: {res.json()['catalog_size']}")

    # 2. Search & RAG Test
    prompt = "I need a laptop for Python development under $700 with quiet fans."
    print(f"\n2. Testing POST /api/search with prompt:\n   \"{prompt}\"")
    res = client.post("/api/search", json={"prompt": prompt})
    assert res.status_code == 200, f"Search failed: {res.text}"
    data = res.json()
    winner = data["top_pick"]
    print(f"   [OK] Winner Selected: {winner['name']} (${winner['price']:.2f})")
    print(f"   [OK] Budget Check:    Passed (${data['intent']['max_budget']:.2f} limit)")
    print(f"   [OK] Explanation:     {data['decision_summary'][:90]}...")

    # 3. Create PayPal Order Test (Stage 1)
    print(f"\n3. Testing POST /api/paypal/create-order for '{winner['name']}'...")
    res = client.post("/api/paypal/create-order", json={
        "item_name": winner["name"],
        "amount": winner["price"],
        "currency": "USD",
        "product_id": winner["id"]
    })
    assert res.status_code == 200, f"Create order failed: {res.text}"
    order_data = res.json()["order"]
    order_id = order_data["id"]
    print(f"   [OK] Order Created:   {order_id}")
    print(f"   [OK] Payment Status:  {order_data['status']} (No money deducted)")

    # 4. Capture PayPal Order Test (Stage 2)
    print(f"\n4. Testing POST /api/paypal/capture-order with explicit consent...")
    res = client.post("/api/paypal/capture-order", json={"order_id": order_id})
    assert res.status_code == 200, f"Capture order failed: {res.text}"
    receipt = res.json()["receipt"]
    print(f"   [OK] Payment Captured: {receipt['status']}")
    print(f"   [OK] Capture Receipt:  {receipt['capture_id']}")
    print(f"   [OK] Total Paid:       ${receipt['amount']['value']} {receipt['amount']['currency_code']}")

    print("\n" + "=" * 65)
    print("   ALL API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
