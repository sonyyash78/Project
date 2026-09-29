import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaWallet, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { walletService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { AmbientPage, GlassPanel, PageHeader, SectionTitle } from '../components/enterprise/Ui';

export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    walletService.getWallet().then(setWallet).catch(() => {}).finally(() => setLoading(false));
  }, [user, navigate]);

  const loadTx = async (type) => {
    setFilter(type);
    const data = await walletService.getTransactions(1, 50, type || undefined);
    setWallet((prev) => ({ ...prev, recent_transactions: data.transactions }));
  };

  if (loading) return <AmbientPage><div className="p-10 text-center">Loading wallet...</div></AmbientPage>;

  return (
    <AmbientPage>
      <PageHeader eyebrow="Wallet" title="Your Wallet" description="Track balance, referral credits, and transaction history." />

      <GlassPanel className="wallet-balance-card mb-8 rounded-[28px] p-8">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-500/20 p-4 text-3xl text-indigo-300"><FaWallet /></div>
          <div>
            <div className="text-sm text-[var(--text-muted)]">Available Balance</div>
            <div className="text-4xl font-black text-[var(--text-primary)]">₹{(wallet?.balance || 0).toFixed(2)}</div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 p-4">
            <div className="text-xs text-[var(--text-muted)]">Total Credited</div>
            <div className="text-lg font-bold text-emerald-400">₹{(wallet?.total_credited || 0).toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-white/8 p-4">
            <div className="text-xs text-[var(--text-muted)]">Total Used</div>
            <div className="text-lg font-bold text-rose-300">₹{(wallet?.total_debited || 0).toFixed(2)}</div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="rounded-[28px] p-6">
        <SectionTitle title="Transactions" subtitle="Filter by credit or debit." />
        <div className="mb-4 flex gap-2">
          {['', 'credit', 'debit'].map((t) => (
            <button key={t || 'all'} onClick={() => loadTx(t)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === t ? 'bg-indigo-500 text-white' : 'border border-white/10'}`}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {(wallet?.recent_transactions || []).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-xl border border-white/8 p-4">
              <div className="flex items-center gap-3">
                {tx.type === 'credit' ? <FaArrowDown className="text-emerald-400" /> : <FaArrowUp className="text-rose-400" />}
                <div>
                  <div className="text-sm font-semibold">{tx.description}</div>
                  <div className="text-xs text-[var(--text-muted)]">{tx.created_at}</div>
                </div>
              </div>
              <div className={`font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-300'}`}>
                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
              </div>
            </div>
          ))}
          {!(wallet?.recent_transactions || []).length && <p className="text-center text-sm text-[var(--text-muted)]">No transactions yet.</p>}
        </div>
      </GlassPanel>
    </AmbientPage>
  );
}
