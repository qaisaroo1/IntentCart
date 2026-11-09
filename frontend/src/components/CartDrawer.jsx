import React from 'react';
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Package,
  CreditCard
} from 'lucide-react';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout
}) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalShipping = cartItems.reduce(
    (sum, item) => sum + (item.product.shipping_fee || 0) * item.quantity,
    0
  );

  const grandTotal = (subtotal + totalShipping).toFixed(2);
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Shopping Cart
                </h3>
                <p className="text-xs text-slate-400">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in your cart
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

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5">
            {cartItems.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-500 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-200 mb-1">
                  Your Cart is Empty
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5 leading-relaxed">
                  Browse our verified catalog and click "Add to Cart" to build your tech bundle.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-blue-500/20"
                >
                  Explore Store Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const { product, quantity } = item;
                  const itemTotal = (
                    (product.price + (product.shipping_fee || 0)) *
                    quantity
                  ).toFixed(2);

                  return (
                    <div
                      key={product.id}
                      className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                            {product.category?.replace('_', ' ')}
                          </span>
                          <h4 className="text-sm font-bold text-white truncate" title={product.name}>
                            {product.name}
                          </h4>
                          <p className="text-xs text-slate-400">By {product.brand}</p>
                        </div>
                        <button
                          onClick={() => onRemoveItem(product.id)}
                          className="text-slate-500 hover:text-rose-400 transition p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity & Item Pricing Controls */}
                      <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs">
                        {/* Quantity Counter */}
                        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                          <button
                            onClick={() => onUpdateQuantity(product.id, -1)}
                            className="text-slate-400 hover:text-white transition p-0.5"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono text-xs font-bold text-white px-2">
                            {quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(product.id, 1)}
                            className="text-slate-400 hover:text-white transition p-0.5"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className="text-xs font-bold text-white font-mono">
                            ${itemTotal}
                          </span>
                          {quantity > 1 && (
                            <span className="block text-[10px] text-slate-400">
                              (${product.price.toFixed(2)} each)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cartItems.length > 0 && (
            <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-900/95 space-y-4">
              {/* Cost Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200">${subtotal.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Shipping:</span>
                  <span className="font-mono text-slate-200">
                    {totalShipping > 0 ? `$${totalShipping.toFixed(2)} USD` : 'FREE'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline text-sm font-bold text-white">
                  <span>Total Amount:</span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">
                    ${grandTotal} USD
                  </span>
                </div>
              </div>

              {/* Security Pill */}
              <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Protected by PayPal Orders v2 Sandbox & Consent Gate</span>
              </div>

              {/* Checkout Button */}
              <button
                onClick={onProceedToCheckout}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-paypal-blue to-paypal-dark hover:from-blue-600 hover:to-paypal-blue text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-paypal-blue/25 transition transform active:scale-[0.99] text-xs"
              >
                <span>Checkout with PayPal Sandbox</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex justify-center">
                <button
                  onClick={onClearCart}
                  className="text-[11px] text-slate-500 hover:text-rose-400 transition flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Empty Entire Cart</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
