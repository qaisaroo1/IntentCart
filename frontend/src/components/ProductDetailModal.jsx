import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  ArrowRight,
  Check,
  Package,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Cpu,
  Monitor,
  Keyboard,
  Mouse,
  Headphones,
  Zap,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

// Format key to a human-readable label
function formatSpecKey(key) {
  const map = {
    cpu: 'Processor (CPU)',
    ram_gb: 'System Memory (RAM)',
    storage_gb: 'Internal Storage',
    battery_hours: 'Battery Life',
    screen_size_inch: 'Screen Size',
    refresh_rate_hz: 'Refresh Rate',
    weight_kg: 'Weight',
    weight_g: 'Weight',
    resolution: 'Native Resolution',
    panel_type: 'Panel Display Tech',
    switch_type: 'Mechanical Switch',
    connectivity: 'Connectivity',
    anc_level: 'Noise Cancellation',
    driver_mm: 'Audio Driver Size',
    battery_anc_hours: 'Battery (with ANC)',
    ports_count: 'Available Ports',
    wattage: 'Power Output',
    dpi: 'Sensor Max DPI',
    sensor: 'Optical Sensor',
    keys_layout: 'Keyboard Layout',
    brightness_nits: 'Peak Brightness',
    color_gamut: 'Color Gamut Coverage',
    response_time_ms: 'Response Time'
  };

  if (map[key]) return map[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Format value with unit if applicable
function formatSpecValue(key, val) {
  if (key === 'ram_gb' || key === 'storage_gb') return `${val} GB`;
  if (key === 'battery_hours' || key === 'battery_anc_hours') return `${val} Hours`;
  if (key === 'screen_size_inch') return `${val} inches`;
  if (key === 'refresh_rate_hz') return `${val} Hz`;
  if (key === 'weight_kg') return `${val} kg`;
  if (key === 'weight_g') return `${val} grams`;
  if (key === 'wattage') return `${val}W`;
  if (key === 'driver_mm') return `${val} mm`;
  if (key === 'response_time_ms') return `${val} ms`;
  if (key === 'brightness_nits') return `${val} nits`;
  return String(val);
}

export default function ProductDetailModal({
  isOpen,
  product,
  onClose,
  onAddToCart,
  onStageCheckout
}) {
  const [isAdded, setIsAdded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const specs = product.specs || {};
  const specEntries = Object.entries(specs);
  const totalCost = (product.price + (product.shipping_fee || 0)).toFixed(2);
  const pros = product.pros || [];
  const cons = product.cons || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
              {product.category?.replace('_', ' ')}
            </span>
            <span className="text-xs font-mono text-slate-500">
              #{product.id}
            </span>
            {product.in_stock ? (
              <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span>In Stock</span>
              </span>
            ) : (
              <span className="text-xs text-rose-400 font-medium">Out of Stock</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Product Title & Pricing Hero */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
                {product.name}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manufacturer / Brand: <span className="text-slate-200 font-semibold">{product.brand}</span>
              </p>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="sm:text-right shrink-0 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-0.5">Price Total</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                ${totalCost}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                {product.shipping_fee > 0
                  ? `Item: $${product.price.toFixed(2)} + $${product.shipping_fee.toFixed(2)} Shipping`
                  : 'Free Expedited Shipping'}
              </div>
            </div>
          </div>

          {/* Complete Technical Specifications Grid */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Cpu className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Complete Technical Specifications ({specEntries.length})
              </h3>
            </div>

            {specEntries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {specEntries.map(([k, v]) => (
                  <div
                    key={k}
                    className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                      {formatSpecKey(k)}
                    </span>
                    <span className="text-xs font-semibold text-white break-words">
                      {formatSpecValue(k, v)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Standard specifications apply.</p>
            )}
          </div>

          {/* Customer Sentiment & Verified Review Analysis */}
          {product.review_summary && (
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-300">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Customer Sentiment & Review Analysis</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 italic leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                "{product.review_summary}"
              </p>

              {/* Pros & Cons */}
              {(pros.length > 0 || cons.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {pros.length > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 mb-2">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Key Strengths & Pros</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {pros.map((pro, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cons.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Trade-Offs & Considerations</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {cons.map((con, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span className="text-amber-400 shrink-0 font-bold">•</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Back to Catalog
          </button>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                if (onAddToCart) onAddToCart(product);
                setIsAdded(true);
                setTimeout(() => setIsAdded(false), 1500);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                onClose();
                if (onStageCheckout) onStageCheckout(product);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-paypal-blue to-paypal-dark hover:from-blue-600 hover:to-paypal-blue text-white text-xs font-bold shadow-md shadow-paypal-blue/30 transition active:scale-[0.98]"
            >
              <span>Buy Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
