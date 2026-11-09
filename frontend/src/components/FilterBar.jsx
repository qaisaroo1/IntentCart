import React from 'react';
import {
  Sparkles,
  Laptop,
  Monitor,
  Headphones,
  Keyboard,
  Mouse,
  Mic,
  DollarSign,
  RotateCcw,
  SlidersHorizontal,
  Check
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: Sparkles },
  { id: 'laptop', label: 'Laptops', icon: Laptop },
  { id: 'monitor', label: 'Monitors', icon: Monitor },
  { id: 'audio', label: 'Audio & ANC', icon: Headphones },
  { id: 'keyboard', label: 'Keyboards', icon: Keyboard },
  { id: 'mouse', label: 'Mice', icon: Mouse },
  { id: 'desk_tech', label: 'Desk Tech', icon: Mic },
];

const BUDGET_PRESETS = [
  { label: 'Any Budget', value: null },
  { label: 'Under $100', value: 100 },
  { label: 'Under $300', value: 300 },
  { label: 'Under $700', value: 700 },
  { label: 'Under $1,500', value: 1500 },
];

export default function FilterBar({
  selectedCategory = 'all',
  onSelectCategory,
  selectedBudget = null,
  onSelectBudget,
  inStockOnly = true,
  onToggleInStock,
  totalCount = 50,
  categoryCounts = {},
  onReset
}) {
  const hasActiveFilters = selectedCategory !== 'all' || selectedBudget !== null || !inStockOnly;

  return (
    <div className="w-full bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 mb-8 shadow-xl backdrop-blur-sm">
      {/* Category Tabs */}
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/50'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Filters: Budget Caps & Toggles */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Budget Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1 text-slate-400 mr-1.5 shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-[11px] uppercase tracking-wider">Budget:</span>
          </div>
          {BUDGET_PRESETS.map((preset) => {
            const isSelected = selectedBudget === preset.value;
            return (
              <button
                key={preset.label}
                onClick={() => onSelectBudget(preset.value)}
                className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* In-Stock Toggle & Reset */}
        <div className="flex items-center space-x-3 ml-auto">
          <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={onToggleInStock}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-[11px]">In Stock Only</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
