import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, Lock } from 'lucide-react';

export default function GuardrailInspector({ checks = [], isOrderStaged = false }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Deterministic Guardrail Inspector
            </h3>
            <p className="text-xs text-slate-400">Zero-Hallucination Policy Verification</p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Enforced
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {checks.map((check, index) => (
          <div
            key={index}
            className={`p-3 rounded-xl border transition-all ${
              check.passed
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                {check.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="text-xs font-semibold text-slate-200">
                  {check.rule_name}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  check.passed
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {check.passed ? 'PASS' : 'FAIL'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 pl-6 leading-relaxed">
              {check.message}
            </p>
          </div>
        ))}

        {/* Human Consent Protocol Gate */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            isOrderStaged
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-slate-800/40 border-slate-700/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {isOrderStaged ? (
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              )}
              <span className="text-xs font-semibold text-slate-200">
                Explicit Human Consent Gate
              </span>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                isOrderStaged
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {isOrderStaged ? 'AWAITING APPROVAL' : 'LOCKED'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 pl-6 leading-relaxed">
            {isOrderStaged
              ? 'Order staged with PayPal. Real funds cannot move until you click "Approve" in the checkout modal.'
              : 'Autonomous payment execution is strictly blocked. Requires user authorization.'}
          </p>
        </div>
      </div>
    </div>
  );
}
