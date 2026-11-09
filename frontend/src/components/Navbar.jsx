import React from 'react';
import { ShoppingCart, CreditCard, Receipt } from 'lucide-react';

export default function Navbar({
  onOpenOrders,
  ordersCount = 0,
  onOpenCart,
  cartCount = 0
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              IntentCart
            </span>
            <p className="text-xs text-slate-400">Budget-Aware Autonomous Purchasing</p>
          </div>
        </div>

        {/* Right Nav: PayPal Sandbox & Actions */}
        <div className="flex items-center space-x-3">
          {/* Live System Badges */}
          <div className="hidden sm:flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 text-xs bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-full">
              <CreditCard className="w-3.5 h-3.5 text-paypal-light" />
              <span className="text-slate-300 font-medium">PayPal Sandbox</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
          </div>

          {/* Orders Button */}
          <button
            onClick={onOpenOrders}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-200 text-xs font-semibold transition hover:border-slate-600 shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">My Orders</span>
            {ordersCount > 0 && (
              <span className="bg-slate-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {ordersCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-200 text-xs font-semibold transition hover:border-blue-400 shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
