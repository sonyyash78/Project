import React from 'react';
import { HiLockClosed } from 'react-icons/hi';

export default function PremiumLock({ children, isLocked, fallbackPlanName = "PRO" }) {
  if (!isLocked) return children;

  return (
    <div className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md z-10 flex flex-col items-center justify-center p-4 text-center select-none animate-fade-in">
        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl text-white mb-3 shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
          <HiLockClosed size={28} />
        </div>
        <h4 className="text-lg font-bold text-white tracking-tight">Enterprise Asset Locked</h4>
        <p className="text-xs text-slate-400 max-w-[240px] mt-1 mb-4">Access limits breached. Unlock with {fallbackPlanName} activation level tier.</p>
        <button onClick={() => window.location.href = '/pricing'} className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-lg shadow-md transition-all">
          Upgrade Plan Layer
        </button>
      </div>
      <div className="opacity-20 pointer-events-none transition-opacity duration-300 select-none">
        {children}
      </div>
    </div>
  );
}