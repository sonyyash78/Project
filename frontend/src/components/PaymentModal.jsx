import React, { useState, useEffect, useCallback } from 'react';
import { paymentService } from '../api/api';
import CouponInput from './CouponInput';
import toast from 'react-hot-toast';

export default function PaymentModal({ planSlug, billingCycle = 'monthly', onClose, onSuccess }) {
  const [useWallet, setUseWallet] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [pricingData, setPricingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const paymentEnabled = Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);

  const fetchPricingSummary = useCallback(async () => {
    try {
      const res = await paymentService.createOrder(planSlug, billingCycle, couponCode, useWallet);
      setPricingData(res);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to calculate pricing.');
    }
  }, [planSlug, billingCycle, couponCode, useWallet]);

  useEffect(() => {
    fetchPricingSummary();
  }, [fetchPricingSummary]);

  const executeCheckout = async () => {
    setLoading(true);
    if (!pricingData) return;

    if (pricingData.gross_total === 0) {
      try {
        await paymentService.verify({
          razorpay_order_id: pricingData.razorpay_order_id,
          razorpay_payment_id: 'FREE_BYPASS_TXN',
          razorpay_signature: 'FREE_BYPASS_SIG',
        });
        toast.success('Subscription activated successfully!');
        onSuccess?.();
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Activation failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!window.Razorpay) {
      // If the payment integration is not configured, show friendly message
      if (!paymentEnabled) {
        toast.error('Payment Gateway Coming Soon (Test Mode)');
      } else {
        toast.error('Payment gateway not loaded. Please refresh.');
      }
      setLoading(false);
      return;
    }

    if (pricingData.gross_total > 0 && !pricingData.razorpay_order_id.startsWith('order_')) {
      toast.error('Payment configuration error on server. Please contact support.');
      setLoading(false);
      return;
    }

    const options = {
      key: pricingData.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round(pricingData.gross_total * 100),
      currency: 'INR',
      name: 'ExamSIDE',
      description: `${planSlug.toUpperCase()} Plan - ${billingCycle}`,
      order_id: pricingData.razorpay_order_id,
      handler: async (response) => {
        try {
          await paymentService.verify(response);
          toast.success('Payment successful! Your plan is now active.');
          onSuccess?.();
        } catch (err) {
          toast.error(err.response?.data?.detail || 'Payment verification failed.');
        }
      },
      theme: { color: '#6366f1' },
    };

    const rz = new window.Razorpay(options);
    rz.on('payment.failed', () => {
      toast.error('Payment failed. Please try again.');
    });
    rz.open();
    setLoading(false);
  };

  const basePrice = pricingData
    ? pricingData.gross_total - pricingData.gst_amount + pricingData.discount + pricingData.wallet_subtracted
    : 0;

  return (
    <div className="payment-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <h3 className="mb-4 text-xl font-bold text-white">Complete Your Subscription</h3>

        <div className="mb-4">
          <CouponInput
            value={couponCode}
            onChange={setCouponCode}
            onValidate={fetchPricingSummary}
            amount={basePrice}
          />
        </div>

        {pricingData && (
          <div className="mb-4 space-y-3 border-b border-slate-800 pb-4 text-sm text-slate-400">
            <div className="flex justify-between">
              <span>Base Price</span>
              <span className="text-white">₹{basePrice.toFixed(2)}</span>
            </div>
            {pricingData.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Coupon Discount</span>
                <span>-₹{pricingData.discount.toFixed(2)}</span>
              </div>
            )}
            {pricingData.wallet_subtracted > 0 && (
              <div className="flex justify-between text-blue-400">
                <span>Wallet Applied</span>
                <span>-₹{pricingData.wallet_subtracted.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST (18%)</span>
              <span className="text-white">₹{pricingData.gst_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-2 text-base font-semibold text-white">
              <span>Total</span>
              <span>₹{pricingData.gross_total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <label className="mb-6 flex items-center gap-3">
          <input
            type="checkbox"
            checked={useWallet}
            onChange={(e) => setUseWallet(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-indigo-600"
          />
          <span className="text-sm text-slate-300">Use wallet balance</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl bg-slate-900 py-2.5 font-medium text-white transition hover:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={executeCheckout}
            disabled={loading || !pricingData}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 font-medium text-white shadow-lg transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
          >
                {loading ? 'Processing...' : (paymentEnabled ? 'Pay Now' : 'Payment Gateway Coming Soon (Test Mode)')}
          </button>
        </div>
      </div>
    </div>
  );
}
