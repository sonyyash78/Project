import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaCrown } from 'react-icons/fa';
import { AmbientPage, GlassPanel } from '../components/enterprise/Ui';

export default function PaymentSuccessPage() {
  return (
    <AmbientPage>
      <div className="confetti-container flex min-h-[70vh] items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <GlassPanel className="mx-auto max-w-lg rounded-[32px] p-10">
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: 3, duration: 0.5 }} className="confetti-burst mb-6 text-6xl text-emerald-400">
              <FaCheckCircle />
            </motion.div>
            <h1 className="text-3xl font-black text-[var(--text-primary)]">Payment Successful!</h1>
            <p className="mt-4 text-[var(--text-secondary)]">Your subscription is now active. Start exploring premium features.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/dashboard" className="btn-primary"><FaCrown /> Go to Dashboard</Link>
              <Link to="/invoices" className="btn-secondary">View Invoices</Link>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </AmbientPage>
  );
}
