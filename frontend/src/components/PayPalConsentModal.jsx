import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { createPayPalOrder, capturePayPalOrder } from '../api';

export default function PayPalConsentModal({ isOpen, onClose, target, onOrderCaptured }) {
  const [isStaging, setIsStaging] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [approvalUrl, setApprovalUrl] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [hasOpenedPopup, setHasOpenedPopup] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const isCart = target?.isCart;
  const items = isCart ? target.items : (target ? [{ product: target, quantity: 1 }] : []);
  const totalCost = isCart
    ? parseFloat(target.totalAmount || 0).toFixed(2)
    : (target ? (target.price + (target.shipping_fee || 0)).toFixed(2) : '0.00');
  const orderTitle = isCart
    ? `IntentCart Tech Bundle (${items.length} items)`
    : (target?.name || 'Verified Tech Product');

  // When modal opens, stage the order via PayPal Orders v2 API
  useEffect(() => {
    if (isOpen && target) {
      setReceipt(null);
      setErrorMessage(null);
      setHasOpenedPopup(false);
      setIsStaging(true);

      createPayPalOrder(target)
        .then((data) => {
          const ord = data.order || {};
          setOrderId(ord.id);
          setIsMock(Boolean(ord.mock_mode));

          // Find the official PayPal approval link
          const approveLink = ord.links?.find((l) => l.rel === 'approve')?.href;
          setApprovalUrl(approveLink || null);
        })
        .catch((err) => {
          setErrorMessage(err.message || "Failed to stage PayPal order");
        })
        .finally(() => {
          setIsStaging(false);
        });
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  // 1. Open the official PayPal Sandbox Approval Popup
  const handleOpenPayPalPopup = () => {
    if (!approvalUrl) return;
    setErrorMessage(null);
    setHasOpenedPopup(true);

    const width = 500;
    const height = 680;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      approvalUrl,
      'PayPalSandboxPopup',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no`
    );

    // Watch for popup close to automatically prompt capture
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
      }
    }, 1000);
  };

  // 2. Capture the approved order
  const handleCapturePayment = async () => {
    if (!orderId) return;
    setIsCapturing(true);
    setErrorMessage(null);

    try {
      const data = await capturePayPalOrder(orderId);
      setReceipt(data.receipt);

      if (onOrderCaptured) {
        onOrderCaptured({
          orderId: data.receipt?.id || orderId,
          captureId: data.receipt?.capture_id,
          target: target,
          isCart: isCart,
          items: items,
          product: isCart
            ? { name: orderTitle, brand: 'Multi-Item Bundle', category: 'bundle' }
            : target,
          amount: data.receipt?.amount?.value || totalCost,
          currency: data.receipt?.amount?.currency_code || 'USD',
          status: data.receipt?.status || 'COMPLETED',
          capturedAt: data.receipt?.captured_at || new Date().toISOString()
        });
      }
    } catch (err) {
      const rawMsg = err.message || '';
      if (rawMsg.includes('ORDER_NOT_APPROVED')) {
        setErrorMessage(
          "Payer approval pending: Please click 'Step 1: Approve on PayPal Sandbox' first and click 'Agree and Pay' inside the PayPal window."
        );
      } else {
        setErrorMessage(rawMsg || "Failed to capture payment");
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    setReceipt(null);
    setOrderId(null);
    setApprovalUrl(null);
    setHasOpenedPopup(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!receipt ? (
          <div>
            {/* Header */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-paypal-blue to-paypal-dark flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-paypal-blue/20">
                P
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  PayPal Checkout Consent Gate
                </h3>
                <p className="text-xs text-slate-400">
                  {isMock ? 'Mock Mode (Local Simulation)' : 'Live PayPal Sandbox Environment'}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-start space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Order Summary Box */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 mb-4 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">PayPal Order ID:</span>
                {isStaging ? (
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Staging with PayPal...</span>
                  </span>
                ) : (
                  <span className="font-mono text-blue-400 font-semibold">{orderId || 'Pending'}</span>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1 py-1">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Items to Purchase:
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-200 truncate max-w-[240px]">
                        {it.product.name} {it.quantity > 1 ? `(x${it.quantity})` : ''}
                      </span>
                      <span className="font-mono text-slate-300">
                        ${((it.product.price + (it.product.shipping_fee || 0)) * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between text-xs pt-1">
                <span className="text-slate-400">Status:</span>
                <span className="text-amber-400 font-semibold">CREATED (Funds Not Moved)</span>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex justify-between items-baseline">
                <span className="text-sm font-semibold text-white">Grand Total:</span>
                <span className="text-xl font-bold text-white font-mono">${totalCost} USD</span>
              </div>
            </div>

            {/* Instruction Banner when Popup Opened */}
            {!isMock && approvalUrl && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 mb-4 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-semibold text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Two-Step Security Handshake</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  1. Click <strong>"1. Approve on PayPal Sandbox"</strong> to open PayPal's secure login popup.
                  <br />
                  2. Log in with your Sandbox buyer account and click <em>"Agree and Pay"</em>.
                  <br />
                  3. Return here and click <strong>"2. Capture Payment & Get Receipt"</strong>.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* If in Mock Mode: Single Click Capture */}
              {isMock ? (
                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCapturePayment}
                    disabled={isCapturing || isStaging || !orderId}
                    className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-paypal-blue to-paypal-dark hover:from-blue-600 hover:to-paypal-blue text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-paypal-blue/25 transition disabled:opacity-50"
                  >
                    {isCapturing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Capturing Payment...</span>
                      </>
                    ) : (
                      <>
                        <span>Authorize & Capture (Instant Test)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Real Sandbox Mode: Step 1 (Approve Popup) & Step 2 (Capture) */
                <div className="space-y-2">
                  <button
                    onClick={handleOpenPayPalPopup}
                    disabled={isStaging || !approvalUrl}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg transition ${
                      hasOpenedPopup
                        ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
                        : 'bg-gradient-to-r from-paypal-blue to-paypal-dark hover:from-blue-600 hover:to-paypal-blue text-white shadow-paypal-blue/25'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {hasOpenedPopup
                        ? 'Step 1: Re-Open PayPal Sandbox Window'
                        : 'Step 1: Approve on PayPal Sandbox'}
                    </span>
                  </button>

                  <button
                    onClick={handleCapturePayment}
                    disabled={isCapturing || isStaging || !orderId}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg transition ${
                      hasOpenedPopup
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-1 ring-emerald-400/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isCapturing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Capturing Approved Order with PayPal...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Step 2: Capture Payment & Generate Receipt</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Receipt Success State */
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">
              Payment Successfully Captured!
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              PayPal Orders API v2 state updated to <strong>COMPLETED</strong>
            </p>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-left space-y-2 text-xs mb-6 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Capture ID:</span>
                <span className="text-emerald-400 font-bold">{receipt.capture_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Order ID:</span>
                <span className="text-slate-200">{receipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid Amount:</span>
                <span className="text-white font-bold">
                  ${receipt.amount?.value || totalCost} {receipt.amount?.currency_code || 'USD'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold">{receipt.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time:</span>
                <span className="text-slate-400">{receipt.captured_at || new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
            >
              Done / Return to Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
