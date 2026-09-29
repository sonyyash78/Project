import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaLockOpen, FaGraduationCap, FaBolt, FaCrown, FaShieldAlt } from 'react-icons/fa';
import { examService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PaymentModal from '../components/PaymentModal';
import { AmbientPage, GlassPanel, PageHeader } from '../components/enterprise/Ui';

const COMBOS = [
  {
    slug: 'combo_engineering',
    name: 'Engineering Super Pack',
    badge: 'Top Choice for JEE / GATE',
    price: 249,
    originalPrice: 894,
    color: 'from-blue-600 to-cyan-500',
    description: '1-Year Unlimited Pass for JEE Main, JEE Advanced, BITSAT, VITEEE, GATE CSE/ECE & MHT CET.',
    features: [
      'All 6+ Engineering Exam Series',
      'AI Question Explainer & Doubt Solver',
      'Chapter-wise & Mock Test Series',
      'Detailed Step-by-Step Solutions',
      '365 Days Unlimited Access',
    ],
  },
  {
    slug: 'combo_medical',
    name: 'Medical Mega Pack',
    badge: 'Best for NEET Aspirants',
    price: 219,
    originalPrice: 447,
    color: 'from-emerald-600 to-teal-500',
    description: '1-Year Unlimited Pass for NEET, AIIMS & JIPMER full tests and high-yield questions.',
    features: [
      'NEET + AIIMS + JIPMER Test Series',
      'AI 7-Day Score Booster Strategy',
      'Physics, Chemistry & Biology Drills',
      'Detailed Explanations & Diagrams',
      '365 Days Unlimited Access',
    ],
  },
  {
    slug: 'combo_banking',
    name: 'Govt & Banking Combo',
    badge: 'High Value Bundle',
    price: 249,
    originalPrice: 894,
    color: 'from-amber-600 to-orange-500',
    description: '1-Year Unlimited Pass for SBI PO, IBPS Clerk, RBI Assistant, SSC CGL, RRB NTPC & UPSC.',
    features: [
      'All Banking, SSC & Railway Exams',
      'Aptitude, Reasoning & English Drills',
      'Full-Length Timed Speed Tests',
      'Rank & Accuracy Analytics',
      '365 Days Unlimited Access',
    ],
  },
  {
    slug: 'combo_all_access',
    name: 'All-India Ultimate Pass',
    badge: '👑 All-In-One Unlimited',
    price: 349,
    originalPrice: 4172,
    color: 'from-purple-600 via-indigo-600 to-pink-500',
    popular: true,
    description: '1-Year VIP Pass for ALL 28+ Engineering, Medical, Govt, Banking, Management & Law exams.',
    features: [
      'Access to ALL 28+ Exams on Platform',
      'Unlimited AI Doubt Solving & Explanations',
      'AI Score Diagnosis & Improvement Plans',
      'All Future Test Series Included Free',
      '365 Days Unlimited Access',
    ],
  },
];

export default function PricingPage() {
  const { user, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('combos'); // 'combos' | 'single'
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

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
          badge="Affordable Student Pricing"
          title="Invest in Your Dream Rank with 100% Transparency"
          subtitle="Get 1 Full Year of unlimited mock tests, chapter practice, and Gemini AI doubt solving at student-friendly prices."
        />

        {/* Tab Switcher */}
        <div className="flex justify-center mt-8 mb-12">
          <div className="inline-flex rounded-2xl border border-white/10 bg-slate-900/80 p-1.5 backdrop-blur-xl shadow-xl">
            <button
              onClick={() => setActiveTab('combos')}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'combos'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaBolt className="text-amber-400" /> Value Combo Bundles
            </button>
            <button
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'single'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaGraduationCap className="text-indigo-400" /> Individual Exam Passes (₹149)
            </button>
          </div>
        </div>

        {/* Combos Tab */}
        {activeTab === 'combos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {COMBOS.map((combo) => (
              <GlassPanel
                key={combo.slug}
                className={`p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-all border relative ${
                  combo.popular ? 'border-indigo-500 shadow-xl shadow-indigo-500/10' : 'border-slate-800'
                }`}
              >
                {combo.popular && (
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Most Popular
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {combo.badge}
                    </span>
                    <FaCrown className={combo.popular ? "text-amber-400 text-lg" : "text-slate-500 text-lg"} />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{combo.name}</h3>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    {combo.description}
                  </p>

                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-3xl font-extrabold text-white">₹{combo.price}</span>
                    <span className="text-sm text-slate-500 line-through">₹{combo.originalPrice}</span>
                    <span className="text-xs text-emerald-400 font-semibold">
                      SAVE {Math.round(((combo.originalPrice - combo.price) / combo.originalPrice) * 100)}%
                    </span>
                  </div>

                  <ul className="space-y-2.5 mb-8">
                    {combo.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center text-xs text-slate-300 gap-2">
                        <FaCheck className="text-emerald-400 text-[10px] shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                    } else {
                      setSelectedPlan(combo);
                    }
                  }}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${combo.color} hover:opacity-90`}
                >
                  <FaLockOpen className="text-sm" /> Unlock {combo.name}
                </button>
              </GlassPanel>
            ))}
          </div>
        )}

        {/* Individual Single Exam Passes */}
        {activeTab === 'single' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <FaLockOpen className="text-sm" /> Unlock {exam.exam_name} Pass (₹{exam.discounted_price || 149})
                    </button>
                  </GlassPanel>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment Modal for Exam Pass */}
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

        {/* Payment Modal for Combo Plan */}
        {selectedPlan && (
          <PaymentModal
            planSlug={selectedPlan.slug}
            billingCycle="yearly"
            onClose={() => setSelectedPlan(null)}
            onSuccess={() => {
              setSelectedPlan(null);
              refreshSubscription?.();
              navigate('/dashboard');
            }}
          />
        )}
      </div>
    </AmbientPage>
  );
}
