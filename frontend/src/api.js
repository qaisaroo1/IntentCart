/**
 * IntentCart API Client
 * Connects the React Frontend to the FastAPI Backend running on http://127.0.0.1:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * 1. Search products via ChromaDB Vector Search + Deterministic Policy Engine
 */
export async function searchProducts(prompt, overrideBudget = null, category = null) {
  const payload = { prompt };
  if (overrideBudget) {
    payload.override_budget = overrideBudget;
  }
  if (category && category !== 'all') {
    payload.category = category;
  }

  const response = await fetch(`${API_BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Search failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * 2. Stage a PayPal Orders v2 transaction (Phase 1: Status CREATED, $0 debited)
 * Supports both single product checkout and multi-item cart bundles
 */
export async function createPayPalOrder(target) {
  let itemName = target.name || 'IntentCart Order';
  let totalAmount = 0.0;
  let productId = target.id || null;

  if (target.isCart) {
    itemName = `IntentCart Bundle (${target.items.length} items)`;
    totalAmount = parseFloat(target.totalAmount);
    productId = 'CART-BUNDLE';
  } else {
    totalAmount = parseFloat((target.price + (target.shipping_fee || 0)).toFixed(2));
  }

  const response = await fetch(`${API_BASE_URL}/api/paypal/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item_name: itemName.slice(0, 120),
      amount: totalAmount,
      currency: 'USD',
      product_id: productId
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create PayPal order');
  }

  return response.json();
}

/**
 * 3. Capture PayPal funds upon explicit user consent (Phase 2: Status COMPLETED)
 */
export async function capturePayPalOrder(orderId) {
  const response = await fetch(`${API_BASE_URL}/api/paypal/capture-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to capture PayPal order');
  }

  return response.json();
}

/**
 * 4. Fetch catalog inventory, optionally filtered by category and budget
 */
export async function getCatalog(category = null, maxBudget = null) {
  const params = new URLSearchParams();
  if (category && category !== 'all') {
    params.append('category', category);
  }
  if (maxBudget) {
    params.append('max_budget', maxBudget);
  }

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/api/catalog${queryString}`);
  if (!response.ok) {
    throw new Error('Failed to fetch catalog');
  }
  return response.json();
}

/**
 * 5. Conversational AI Chat with AI Agent & Tool Calling
 */
export async function chatWithAgent(prompt, conversationHistory = []) {
  const response = await fetch(`${API_BASE_URL}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      conversation_history: conversationHistory
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to reach AI Agent');
  }

  return response.json();
}
