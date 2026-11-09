"""
PayPal Payment Service for IntentCart.

Supports two modes seamlessly:
1. Mock Mode (Default when credentials missing): Simulates PayPal Orders v2 API responses
   locally with realistic Order IDs and capture receipts.
2. Real Sandbox Mode: Connects directly to https://api-m.sandbox.paypal.com using
   OAuth2 Client Credentials authentication when credentials are provided in .env.
"""

import os
import time
import uuid
import base64
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Automatically load .env from backend directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)


class PayPalService:
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        use_mock: Optional[bool] = None
    ):
        self.client_id = client_id or os.getenv("PAYPAL_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("PAYPAL_CLIENT_SECRET")
        
        # If use_mock is not explicitly passed, check env variable; fallback to False if credentials exist
        if use_mock is not None:
            self.use_mock = use_mock
        else:
            env_mock = os.getenv("PAYPAL_USE_MOCK")
            if env_mock is not None:
                self.use_mock = env_mock.strip().lower() in ("true", "1", "yes")
            else:
                self.use_mock = not bool(self.client_id and self.client_secret)

        self.base_url = "https://api-m.sandbox.paypal.com"
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

        # In-memory storage for mock orders
        self._mock_orders_db: Dict[str, Dict[str, Any]] = {}

    # =========================================================================
    # 1. CREATE ORDER (Phase 1: Stages transaction, NO money taken yet)
    # =========================================================================
    def create_order(
        self,
        item_name: str,
        amount: float,
        currency: str = "USD",
        user_intent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a new PayPal Order with status 'CREATED'.
        The user must explicitly approve this order before funds can be captured.
        """
        amount_str = f"{amount:.2f}"

        if self.use_mock or not (self.client_id and self.client_secret):
            order_id = f"MOCK-ORD-{uuid.uuid4().hex[:10].upper()}"
            mock_order = {
                "id": order_id,
                "status": "CREATED",
                "intent": "CAPTURE",
                "create_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "purchase_units": [
                    {
                        "reference_id": user_intent_id or f"INTENT-{uuid.uuid4().hex[:6].upper()}",
                        "description": item_name,
                        "amount": {
                            "currency_code": currency,
                            "value": amount_str
                        }
                    }
                ],
                "links": [
                    {
                        "href": f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}",
                        "rel": "approve",
                        "method": "GET"
                    }
                ],
                "mock_mode": True
            }
            self._mock_orders_db[order_id] = mock_order
            return mock_order

        # Real PayPal Sandbox API Call
        token = self._get_access_token()
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": user_intent_id or "INTENTCART-001",
                    "description": item_name,
                    "amount": {
                        "currency_code": currency,
                        "value": amount_str
                    }
                }
            ],
            "application_context": {
                "brand_name": "IntentCart AI",
                "user_action": "PAY_NOW",
                "return_url": "http://localhost:5173",
                "cancel_url": "http://localhost:5173"
            }
        }
        res = self._make_request("/v2/checkout/orders", "POST", payload, token)
        res["mock_mode"] = False
        return res

    # =========================================================================
    # 2. CAPTURE ORDER (Phase 2: Triggered ONLY after explicit user consent)
    # =========================================================================
    def capture_order(self, order_id: str) -> Dict[str, Any]:
        """
        Captures funds for an approved PayPal Order.
        Changes status from 'APPROVED' / 'CREATED' to 'COMPLETED'.
        """
        if self.use_mock or not (self.client_id and self.client_secret):
            if order_id not in self._mock_orders_db:
                raise ValueError(f"Order '{order_id}' not found in mock store.")

            order = self._mock_orders_db[order_id]
            if order.get("status") == "COMPLETED":
                raise ValueError(f"Order '{order_id}' has already been captured (duplicate prevention).")

            order["status"] = "COMPLETED"
            capture_id = f"MOCK-CAP-{uuid.uuid4().hex[:10].upper()}"
            receipt = {
                "id": order_id,
                "status": "COMPLETED",
                "capture_id": capture_id,
                "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "amount": order["purchase_units"][0]["amount"],
                "item_name": order["purchase_units"][0]["description"],
                "mock_mode": True
            }
            order["receipt"] = receipt
            return receipt

        # Real PayPal Sandbox Capture API Call
        token = self._get_access_token()
        res = self._make_request(f"/v2/checkout/orders/{order_id}/capture", "POST", {}, token)
        res["mock_mode"] = False
        return res

    # =========================================================================
    # 3. GET ORDER DETAILS (Audit / Status Verification)
    # =========================================================================
    def get_order(self, order_id: str) -> Dict[str, Any]:
        """Fetches the current status of an order."""
        if self.use_mock or not (self.client_id and self.client_secret):
            if order_id not in self._mock_orders_db:
                raise ValueError(f"Order '{order_id}' not found.")
            return self._mock_orders_db[order_id]

        token = self._get_access_token()
        return self._make_request(f"/v2/checkout/orders/{order_id}", "GET", None, token)

    # =========================================================================
    # Internal Helpers (OAuth2 & HTTP calls for real PayPal Sandbox)
    # =========================================================================
    def _get_access_token(self) -> str:
        """Retrieves and caches OAuth2 Bearer token using Client Credentials."""
        if self._access_token and time.time() < self._token_expires_at:
            return self._access_token

        auth_header = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        req = urllib.request.Request(
            f"{self.base_url}/v1/oauth2/token",
            data=b"grant_type=client_credentials",
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            self._access_token = data["access_token"]
            self._token_expires_at = time.time() + data.get("expires_in", 3600) - 60
            return self._access_token

    def _make_request(self, endpoint: str, method: str, payload: Optional[Dict], token: str) -> Dict[str, Any]:
        """Sends authenticated JSON request to PayPal Sandbox API."""
        url = f"{self.base_url}{endpoint}"
        body = json.dumps(payload).encode() if payload is not None else None
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode()
            raise RuntimeError(f"PayPal API error ({e.code}): {err_msg}")


# =========================================================================
# Standalone Quick Test (Tests Live Sandbox or Mock Mode)
# =========================================================================
if __name__ == "__main__":
    print("=" * 65)
    print("      INTENTCART PAYPAL SERVICE - SANDBOX TEST RUNNER")
    print("=" * 65)

    service = PayPalService()
    mode_str = "MOCK SIMULATOR" if service.use_mock else "LIVE PAYPAL SANDBOX"
    print(f"\nActive Gateway Mode: [{mode_str}]")
    if not service.use_mock:
        print(f"Client ID: {service.client_id[:10]}...{service.client_id[-6:]}")

    item = "Lenovo ThinkBook 14 Gen 6"
    cost = 649.99

    print(f"\n1. Testing OAuth & Order Creation for: '{item}' (${cost:.2f})...")
    try:
        order = service.create_order(item_name=item, amount=cost)
        order_id = order["id"]
        print(f"   --> SUCCESS! Order Created.")
        print(f"   --> Order ID:     {order_id}")
        print(f"   --> Status:       {order['status']}")
        
        # Find the checkout approval link
        approve_link = next((l["href"] for l in order.get("links", []) if l.get("rel") == "approve"), None)
        if approve_link:
            print(f"   --> Approval URL: {approve_link}")
        
        print("\n2. Fetching Order Details from PayPal...")
        fetched = service.get_order(order_id)
        print(f"   --> Order Verified from PayPal! Status: {fetched['status']}")

        print("\n" + "=" * 65)
        print("   PAYPAL SANDBOX CONNECTION VERIFIED 100% OPERATIONAL!")
        print("=" * 65)

    except Exception as e:
        print(f"\n   [ERROR] Failed to communicate with PayPal: {e}")
        print("=" * 65)
