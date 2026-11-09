import React, { useState } from 'react';
import {
  X,
  Receipt,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Package,
  Clock,
  DollarSign
} from 'lucide-react';

export default function OrdersDrawer({
  isOpen,
  onClose,
  orders = [],
  onClearOrders
}) {
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalSpent = orders
    .reduce((sum, order) => sum + parseFloat(order.amount || 0), 0)
    .toFixed(2);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  My Orders & Receipts
                </h3>
                <p className="text-xs text-slate-400">
                  PayPal Sandbox Verified Purchases ({orders.length})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-500 flex items-center justify-center mx-auto mb-3">
                  <Package className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-200 mb-1">
                  No Orders Placed Yet
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Select any product from the catalog or run an AI search, then click "Stage Order with PayPal" to complete a test purchase.
                </p>
              </div>
            ) : (
              <>
                {/* Total Spend Summary Banner */}
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Total Sandbox Spend:</span>
                  </div>
                  <span className="text-sm font-extrabold text-white font-mono">
                    ${totalSpent} USD
                  </span>
                </div>

                {/* Orders List */}
                <div className="space-y-3.5">
                  {orders.map((order, idx) => {
                    const product = order.product || {};
                    const orderDate = order.capturedAt
                      ? new Date(order.capturedAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })
                      : 'Just now';

                    return (
                      <div
                        key={order.captureId || order.orderId || idx}
                        className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3 hover:border-slate-600 transition"
                      >
                        {/* Status & Date */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{order.status || 'COMPLETED'}</span>
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{orderDate}</span>
                          </span>
                        </div>

                        {/* Product Info */}
                        <div>
                          <h4 className="text-sm font-bold text-white line-clamp-1">
                            {product.name || 'Verified Product'}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            By {product.brand || 'Store Partner'} · Category: {product.category || 'Tech'}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Amount Paid:</span>
                          <span className="text-sm font-extrabold text-emerald-400 font-mono">
                            ${parseFloat(order.amount || product.price || 0).toFixed(2)} USD
                          </span>
                        </div>

                        {/* Transaction IDs with Copy */}
                        <div className="bg-slate-900/80 rounded-xl p-2.5 space-y-1.5 text-[11px] font-mono">
                          {order.captureId && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Capture ID:</span>
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-300 truncate max-w-[150px]">
                                  {order.captureId}
                                </span>
                                <button
                                  onClick={() => handleCopy(order.captureId, `cap-${idx}`)}
                                  className="text-slate-400 hover:text-white transition p-0.5"
                                  title="Copy Capture ID"
                                >
                                  {copiedId === `cap-${idx}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Order ID:</span>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-300 truncate max-w-[150px]">
                                {order.orderId}
                              </span>
                              <button
                                onClick={() => handleCopy(order.orderId, `ord-${idx}`)}
                                className="text-slate-400 hover:text-white transition p-0.5"
                                title="Copy Order ID"
                              >
                                {copiedId === `ord-${idx}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {orders.length > 0 && (
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
              <button
                onClick={onClearOrders}
                className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Order History</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
