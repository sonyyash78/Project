import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCopy, FaGift, FaUsers } from 'react-icons/fa';
import { referralService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { AmbientPage, GlassPanel, MetricCard, PageHeader, SectionTitle } from '../components/enterprise/Ui';
import toast from 'react-hot-toast';

export default function ReferralPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    referralService.getStats().then(setData).catch(() => {});
  }, [user, navigate]);

  const copyCode = () => {
    if (data?.referral_code) {
      navigator.clipboard.writeText(data.referral_code);
      toast.success('Referral code copied!');
    }
  };

  return (
    <AmbientPage>
      <PageHeader eyebrow="Referrals" title="Invite Friends, Earn ₹50" description="Share your code. When they make their first purchase, you get ₹50 in your wallet." />

      <GlassPanel className="referral-share-card mb-8 rounded-[28px] p-8 text-center">
        <FaGift className="mx-auto mb-4 text-4xl text-fuchsia-400" />
        <div className="text-sm text-[var(--text-muted)]">Your Referral Code</div>
        <div className="mt-2 text-4xl font-black tracking-widest text-[var(--text-primary)]">{data?.referral_code || '...'}</div>
        <button onClick={copyCode} className="btn-primary mx-auto mt-6"><FaCopy /> Copy Code</button>
      </GlassPanel>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Referred" value={data?.total_referred || 0} icon={<FaUsers />} />
        <MetricCard label="Successful" value={data?.successful || 0} icon={<FaGift />} />
        <MetricCard label="Earnings" value={`₹${(data?.earnings || 0).toFixed(0)}`} icon={<FaCopy />} />
      </div>

      <GlassPanel className="rounded-[28px] p-6">
        <SectionTitle title="Referred Users" subtitle="Track your referral activity." />
        <div className="space-y-3">
          {(data?.referrals || []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/8 p-4">
              <div>
                <div className="text-sm font-semibold">{r.referred_name || 'Pending signup'}</div>
                <div className="text-xs text-[var(--text-muted)]">{r.created_at}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.status === 'rewarded' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>
                {r.status}
              </span>
            </div>
          ))}
          {!(data?.referrals || []).length && <p className="text-center text-sm text-[var(--text-muted)]">No referrals yet. Share your code!</p>}
        </div>
      </GlassPanel>
    </AmbientPage>
  );
}
