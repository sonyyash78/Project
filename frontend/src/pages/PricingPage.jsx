import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCheck, FaCrown } from 'react-icons/fa';
import { subscriptionService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PaymentModal from '../components/PaymentModal';
import { AmbientPage, GlassPanel, PageHeader, SectionTitle } from '../components/enterprise/Ui';

export default function PricingPage() {
  const { user, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkout, setCheckout] = useState(null);
  const paymentEnabled = Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);

  // Fallback pricing when API is unavailable or returns empty
  const fallbackPlans = [
    {
      id: 'free',
      name: 'Free',
      slug: 'free',
      monthly_price: 0,
      yearly_price: 0,
      features: [
        { feature_key: 'premium_tests', feature_name: 'Premium Tests', is_enabled: false },
        { feature_key: 'mock_tests', feature_name: 'Mock Tests', is_enabled: false },
        { feature_key: 'analytics', feature_name: 'Analytics', is_enabled: false },
        { feature_key: 'bookmarks', feature_name: 'Bookmarks', is_enabled: false },
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      slug: 'pro',
      monthly_price: 149,
      yearly_price: 1499,
      features: [
        { feature_key: 'premium_tests', feature_name: 'Premium Tests', is_enabled: true },
        { feature_key: 'mock_tests', feature_name: 'Mock Tests', is_enabled: true },
        { feature_key: 'analytics', feature_name: 'Analytics', is_enabled: true },
        { feature_key: 'bookmarks', feature_name: 'Bookmarks', is_enabled: true },
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      slug: 'premium',
      monthly_price: 299,
      yearly_price: 2999,
      features: [
        { feature_key: 'premium_tests', feature_name: 'Premium Tests', is_enabled: true },
        { feature_key: 'mock_tests', feature_name: 'Mock Tests', is_enabled: true },
        { feature_key: 'analytics', feature_name: 'Analytics', is_enabled: true },
        { feature_key: 'bookmarks', feature_name: 'Bookmarks', is_enabled: true },
        { feature_key: 'advanced_reports', feature_name: 'Advanced Reports', is_enabled: true },
      ],
    },
    {
      id: 'ultimate',
      name: 'Ultimate',
      slug: 'ultimate',
      monthly_price: 499,
      yearly_price: 4999,
      features: [
        { feature_key: 'premium_tests', feature_name: 'Premium Tests', is_enabled: true },
        { feature_key: 'mock_tests', feature_name: 'Mock Tests', is_enabled: true },
        { feature_key: 'analytics', feature_name: 'Analytics', is_enabled: true },
        { feature_key: 'bookmarks', feature_name: 'Bookmarks', is_enabled: true },
        { feature_key: 'advanced_reports', feature_name: 'Advanced Reports', is_enabled: true },
        { feature_key: 'ai_features', feature_name: 'AI Features', is_enabled: true },
      ],
    },
  ];

  useEffect(() => {
    subscriptionService.getPlans().then((d) => setPlans(d.plans || [])).catch(() => {});
  }, []);

  const handleChoose = (slug) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (slug === 'free') {
      subscriptionService.subscribe('free').then(() => {
        refreshSubscription?.();
      });
      return;
    }
    setCheckout({ slug, billingCycle });
  };

  const compareFeatures = [
    { key: 'premium_tests', label: 'Premium Tests' },
    { key: 'mock_tests', label: 'Mock Tests' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'bookmarks', label: 'Bookmarks' },
    { key: 'advanced_reports', label: 'Advanced Reports' },
    { key: 'ai_features', label: 'AI Features' },
  ];

  return (
    <AmbientPage>
      <PageHeader
        eyebrow="Pricing"
        title="Choose the plan that fits your preparation"
        description="FREE, PRO, PREMIUM, and ULTIMATE — transparent pricing with GST included at checkout."
      />

      <div className="pricing-toggle mb-8 flex justify-center gap-2">
        <button onClick={() => setBillingCycle('monthly')} className={`rounded-full px-5 py-2 text-sm font-semibold ${billingCycle === 'monthly' ? 'bg-indigo-500 text-white' : 'border border-white/10'}`}>Monthly</button>
        <button onClick={() => setBillingCycle('yearly')} className={`rounded-full px-5 py-2 text-sm font-semibold ${billingCycle === 'yearly' ? 'bg-indigo-500 text-white' : 'border border-white/10'}`}>Yearly</button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {(plans.length ? plans : fallbackPlans).map((plan) => {
          const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
          return (
            <GlassPanel key={plan.slug} className={`plan-card rounded-[28px] p-6 ${plan.slug === 'premium' ? 'plan-card-popular' : ''}`}>
              {plan.slug === 'premium' && <span className="popular-badge mb-3 inline-block rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300">Most Popular</span>}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-3 text-4xl font-black">₹{price}<span className="text-sm font-normal text-[var(--text-muted)]">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span></div>
              <ul className="mt-5 space-y-2">
                {(plan.features || []).filter((f) => f.is_enabled).map((f) => (
                  <li key={f.feature_key} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><FaCheck className="text-emerald-400" />{f.feature_name}</li>
                ))}
              </ul>
              {/* Disable purchase if payment gateway is not configured */}
              <button
                onClick={() => handleChoose(plan.slug)}
                className="btn-primary mt-6 w-full justify-center"
                disabled={!paymentEnabled && plan.slug !== 'free'}
                title={!paymentEnabled && plan.slug !== 'free' ? 'Payment Gateway Coming Soon (Test Mode)' : ''}
              >
                {plan.slug === 'free' ? 'Get Started' : (
                  !paymentEnabled ? 'Payment Gateway Coming Soon (Test Mode)' : <><FaCrown className="mr-2" /> Choose Plan</>
                )}
              </button>
            </GlassPanel>
          );
        })}
      </div>

      <GlassPanel className="invoice-table mt-10 rounded-[28px] p-6">
        <SectionTitle title="Feature comparison" subtitle="See what's included in each plan." />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[var(--text-muted)]">
                <th className="px-3 py-3">Feature</th>
                {plans.map((p) => <th key={p.slug} className="px-3 py-3">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {compareFeatures.map((feat) => (
                <tr key={feat.key} className="border-b border-white/6">
                  <td className="px-3 py-3 font-medium">{feat.label}</td>
                  {plans.map((p) => {
                    const enabled = (p.features || []).find((f) => f.feature_key === feat.key)?.is_enabled;
                    return <td key={p.slug} className="px-3 py-3">{enabled ? '✓' : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {checkout && (
        <PaymentModal
          planSlug={checkout.slug}
          billingCycle={checkout.billingCycle}
          onClose={() => setCheckout(null)}
          onSuccess={() => { setCheckout(null); refreshSubscription?.(); navigate('/payment-success'); }}
        />
      )}
    </AmbientPage>
  );
}
