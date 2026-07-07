import React from 'react';
import { Link } from 'react-router-dom';
import { FaLock, FaCrown } from 'react-icons/fa';

export default function PremiumLock({ feature = 'Premium Feature', minPlan = 'PRO' }) {
  return (
    <div className="premium-lock-overlay relative overflow-hidden rounded-[24px]">
      <div className="pointer-events-none select-none blur-sm opacity-40">
        <div className="h-48 rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/60 p-6 text-center backdrop-blur-sm">
        <FaLock className="text-3xl text-indigo-300" />
        <h3 className="text-lg font-bold text-white">{feature}</h3>
        <p className="max-w-xs text-sm text-slate-300">
          Upgrade to {minPlan} or higher to unlock this feature.
        </p>
        <div className="flex gap-3">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-500 hover:to-violet-500"
          >
            <FaCrown /> Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  );
}
