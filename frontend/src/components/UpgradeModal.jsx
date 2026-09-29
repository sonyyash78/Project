import React, { useEffect, useState } from 'react';
import { subscriptionService } from '../api/api';
import PaymentModal from './PaymentModal';
import { GlassPanel } from './enterprise/Ui';
import { FaCheck } from 'react-icons/fa';

export default function UpgradeModal({ isOpen, onClose, onSuccess, currentPlan = 'free' }) {
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      subscriptionService.getPlans().then((data) => setPlans(data.plans || [])).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (showPayment && selectedSlug) {
    return (
      <PaymentModal
        planSlug={selectedSlug}
        billingCycle={billingCycle}
        onClose={() => { setShowPayment(false); onClose?.(); }}
        onSuccess={() => { setShowPayment(false); onSuccess?.(); onClose?.(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md">
      <GlassPanel className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Choose Your Plan</h2>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--text-secondary)]">Close</button>
        </div>

        <div className="pricing-toggle mb-6 flex justify-center gap-2">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${billingCycle === 'monthly' ? 'bg-indigo-500 text-white' : 'border border-white/10 text-[var(--text-secondary)]'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${billingCycle === 'yearly' ? 'bg-indigo-500 text-white' : 'border border-white/10 text-[var(--text-secondary)]'}`}
          >
            Yearly (Save 17%)
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {plans.filter((p) => p.slug !== 'free').map((plan) => {
            const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
            const isCurrent = plan.slug === currentPlan;
            return (
              <div
                key={plan.slug}
                className={`plan-card rounded-[24px] border p-5 ${plan.slug === 'premium' ? 'plan-card-popular border-purple-400/30' : 'border-white/10'}`}
              >
                {plan.slug === 'premium' && <span className="popular-badge mb-2 inline-block rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300">Most Popular</span>}
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{plan.name}</h3>
                <div className="mt-2 text-3xl font-black text-[var(--text-primary)]">
                  ₹{price}<span className="text-sm font-normal text-[var(--text-muted)]">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {(plan.features || []).filter((f) => f.is_enabled).slice(0, 4).map((f) => (
                    <li key={f.feature_key} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <FaCheck className="text-emerald-400" /> {f.feature_name}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCurrent}
                  onClick={() => { setSelectedSlug(plan.slug); setShowPayment(true); }}
                  className="mt-5 w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isCurrent ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}
