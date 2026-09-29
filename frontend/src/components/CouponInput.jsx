import { useState } from 'react';
import { couponService } from '../api/api';
import { FaTag } from 'react-icons/fa';

export default function CouponInput({ value, onChange, onValidate, amount = 0 }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const result = await couponService.validate(value, amount || 100);
      if (result.valid) {
        setStatus({ type: 'success', message: `₹${result.discount.toFixed(2)} off applied!` });
        onValidate?.();
      } else {
        setStatus({ type: 'error', message: result.message || 'Invalid coupon' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.detail || 'Invalid coupon' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FaTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={value}
            onChange={(e) => { onChange(e.target.value.toUpperCase()); setStatus(null); }}
            placeholder="Coupon code"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500"
          />
        </div>
        <button
          onClick={handleValidate}
          disabled={loading || !value.trim()}
          className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-300 disabled:opacity-50"
        >
          {loading ? '...' : 'Apply'}
        </button>
      </div>
      {status && (
        <p className={`mt-2 text-xs ${status.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
