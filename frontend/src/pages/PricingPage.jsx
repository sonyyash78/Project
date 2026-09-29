import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCheck, FaLockOpen, FaGraduationCap } from 'react-icons/fa';
import { examService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PaymentModal from '../components/PaymentModal';
import { AmbientPage, GlassPanel, PageHeader } from '../components/enterprise/Ui';

export default function PricingPage() {
  const { user, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    async function fetchExams() {
      try {
        const data = await examService.listExams(1, 50);
        setExams(Array.isArray(data) ? data : (data.items || []));
      } catch (err) {
        console.error('Failed to fetch exams for pricing:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchExams();
  }, []);

  return (
    <AmbientPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          badge="Affordable Exam Passes"
          title="Buy Access To The Specific Exam You Need"
          subtitle="No expensive all-access passes. Just pick the exact exam you are preparing for and get 1 Full Year of unlimited mock tests and chapter practice for under ₹200!"
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {exams.map((exam) => (
              <GlassPanel key={exam.id} className="p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-all border border-slate-800">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {exam.category || 'Competitive'}
                    </span>
                    <FaGraduationCap className="text-xl text-slate-400" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{exam.exam_name}</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Complete 1-Year Pass for all mock tests, full syllabus questions, and performance analytics.
                  </p>

                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-3xl font-extrabold text-white">₹{exam.discounted_price || 149}</span>
                    <span className="text-sm text-slate-500 line-through">₹{exam.price || 199}</span>
                    <span className="text-xs text-emerald-400 font-semibold">SAVE 25%</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center text-sm text-slate-300 gap-2">
                      <FaCheck className="text-emerald-400 text-xs" /> Full-length Timed Mock Tests
                    </li>
                    <li className="flex items-center text-sm text-slate-300 gap-2">
                      <FaCheck className="text-emerald-400 text-xs" /> All Chapter & Subject Wise Tests
                    </li>
                    <li className="flex items-center text-sm text-slate-300 gap-2">
                      <FaCheck className="text-emerald-400 text-xs" /> Detailed Solutions & KaTeX Math
                    </li>
                    <li className="flex items-center text-sm text-slate-300 gap-2">
                      <FaCheck className="text-emerald-400 text-xs" /> 365 Days Unlimited Access
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                    } else {
                      setSelectedExam(exam);
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <FaLockOpen className="text-sm" /> Unlock {exam.exam_name} Pass
                </button>
              </GlassPanel>
            ))}
          </div>
        )}

        {selectedExam && (
          <PaymentModal
            examId={selectedExam.id}
            onClose={() => setSelectedExam(null)}
            onSuccess={() => {
              setSelectedExam(null);
              refreshSubscription?.();
              navigate('/dashboard');
            }}
          />
        )}
      </div>
    </AmbientPage>
  );
}
