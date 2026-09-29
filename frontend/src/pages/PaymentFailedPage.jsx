import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import { AmbientPage, GlassPanel } from '../components/enterprise/Ui';

export default function PaymentFailedPage() {
  return (
    <AmbientPage>
      <div className="flex min-h-[70vh] items-center justify-center">
        <GlassPanel className="mx-auto max-w-lg rounded-[32px] p-10 text-center">
          <FaExclamationTriangle className="mx-auto mb-6 text-6xl text-rose-400" />
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Payment Failed</h1>
          <p className="mt-4 text-[var(--text-secondary)]">Your payment could not be processed. No charges were made.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/pricing" className="btn-primary"><FaRedo /> Try Again</Link>
            <a href="mailto:support@examside.com" className="btn-secondary">Contact Support</a>
          </div>
        </GlassPanel>
      </div>
    </AmbientPage>
  );
}
