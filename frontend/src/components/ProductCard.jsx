import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  Battery,
  Weight,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Monitor,
  Keyboard,
  Mouse,
  CheckCircle2,
  Zap,
  Volume2,
  ShoppingCart,
  Check,
  Eye
} from 'lucide-react';

// Formatter to render clean label & value for any specification key
function renderSpecItem(key, val) {
  let label = key.replace(/_/g, ' ');
  let displayVal = String(val);

  if (key === 'cpu') {
    label = 'Processor';
  } else if (key === 'ram_gb') {
    label = 'Memory';
    displayVal = `${val} GB`;
  } else if (key === 'storage_gb') {
    label = 'Storage';
    displayVal = `${val} GB`;
  } else if (key === 'battery_hours') {
    label = 'Battery';
    displayVal = `${val} Hours`;
  } else if (key === 'screen_size_inch') {
    label = 'Screen';
    displayVal = `${val}"`;
  } else if (key === 'refresh_rate_hz') {
    label = 'Refresh';
    displayVal = `${val} Hz`;
  } else if (key === 'weight_kg') {
    label = 'Weight';
    displayVal = `${val} kg`;
  } else if (key === 'weight_g') {
    label = 'Weight';
    displayVal = `${val} g`;
  } else if (key === 'switch_type') {
    label = 'Switch';
  } else if (key === 'connectivity') {
    label = 'Connection';
  } else if (key === 'resolution') {
    label = 'Resolution';
  } else if (key === 'panel_type') {
    label = 'Panel';
  }

  return (
    <div key={key} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-2 sm:p-2.5">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5 truncate">
        {label}
      </span>
      <p className="text-xs font-semibold text-slate-100 truncate" title={displayVal}>
        {displayVal}
      </p>
    </div>
  );
}

export default function ProductCard({
  product,
  decisionSummary = null,
  badgeLabel = null,
  badgeVariant = 'blue',
  onStageCheckout,
  onAddToCart,
  onViewDetails,
  isBlocked = false,
  compact = false
}) {
  const [isAdded, setIsAdded] = useState(false);
  if (!product) return null;

  const specs = product.specs || {};
  const specEntries = Object.entries(specs).slice(0, 4);
  const totalCost = (product.price + (product.shipping_fee || 0)).toFixed(2);

  // Badge styling
  const badgeClasses = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700/50'
  }[badgeVariant] || 'bg-blue-500/20 text-blue-300 border-blue-500/30';

  return (
    <div
      className={`bg-slate-900/90 border rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between hover:border-slate-700 ${
        isBlocked
          ? 'border-rose-500/50 bg-rose-950/10'
          : badgeVariant === 'blue'
          ? 'border-blue-500/40 ring-1 ring-blue-500/20 shadow-blue-500/5'
          : 'border-slate-800/80 hover:shadow-2xl'
      }`}
    >
      <div>
        {/* Header Badge & Stock */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            {isBlocked ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Safety Blocked: Budget Exceeded</span>
              </span>
            ) : badgeLabel ? (
              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${badgeClasses}`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{badgeLabel}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize bg-slate-800 text-slate-300 border border-slate-700">
                {product.category?.replace('_', ' ')}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {product.in_stock ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span>In Stock</span>
              </span>
            ) : (
              <span className="text-rose-400">Out of Stock</span>
            )}
          </span>
        </div>

        {/* Title & Pricing */}
        <div className="mb-3">
          <h2
            onClick={() => onViewDetails && onViewDetails(product)}
            className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2 min-h-[3rem] leading-snug hover:text-blue-400 cursor-pointer transition"
            title={product.name}
          >
            {product.name}
          </h2>
          <div className="flex items-baseline justify-between mt-1.5">
            <p className="text-xs text-slate-400 font-medium">By {product.brand}</p>
            <div className="text-right">
              <span className="text-xl font-extrabold text-white tracking-tight">${totalCost}</span>
              <span className="block text-[10px] text-slate-400 font-medium">
                {product.shipping_fee > 0
                  ? `+ $${product.shipping_fee.toFixed(2)} Shipping`
                  : 'Free Shipping'}
              </span>
            </div>
          </div>
        </div>

        {/* Hardware Specs Grid (Clean 2x2 grid) */}
        {specEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-2 my-3">
            {specEntries.map(([k, v]) => renderSpecItem(k, v))}
          </div>
        )}

        {/* Customer Review Sentiment Box */}
        {product.review_summary && (
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-blue-300 mb-1">
              <div className="flex items-center space-x-1.5">
                <MessageSquare className="w-3 h-3 text-blue-400" />
                <span>Customer Sentiment</span>
              </div>
              <button
                onClick={() => onViewDetails && onViewDetails(product)}
                className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline font-normal"
              >
                More →
              </button>
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed line-clamp-2">
              "{product.review_summary}"
            </p>
          </div>
        )}

        {/* Trade-Off Decision Reasoning (Only shown on top winner) */}
        {decisionSummary && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/30 border border-blue-500/25 mb-4">
            <h4 className="text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-1">
              Agent Decision & Trade-Off Analysis:
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {decisionSummary}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons: Details, Add to Cart, Buy Now */}
      <div className="mt-2 pt-2 border-t border-slate-800/50">
        {!isBlocked ? (
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onViewDetails && onViewDetails(product)}
              className="flex items-center justify-center space-x-1 py-2.5 px-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-300 font-medium text-xs transition"
              title="View full specifications & customer reviews"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Details</span>
            </button>

            <button
              onClick={() => {
                if (onAddToCart) onAddToCart(product);
                setIsAdded(true);
                setTimeout(() => setIsAdded(false), 1500);
              }}
              className="flex items-center justify-center space-x-1 py-2.5 px-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-200 font-semibold text-xs transition active:scale-[0.98]"
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Added!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add</span>
                </>
              )}
            </button>

            <button
              onClick={() => onStageCheckout && onStageCheckout(product)}
              className="flex items-center justify-center space-x-1 bg-gradient-to-r from-paypal-blue to-paypal-dark hover:from-blue-600 hover:to-paypal-blue text-white font-semibold py-2.5 px-1.5 rounded-xl shadow-md shadow-paypal-blue/20 transition active:scale-[0.98] text-xs"
            >
              <span>Buy Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="p-2.5 text-center bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-300">
            Checkout Blocked: Violates Budget Constraints
          </div>
        )}
      </div>
    </div>
  );
}
