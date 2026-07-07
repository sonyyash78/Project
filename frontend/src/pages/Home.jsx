import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  FaArrowRight,
  FaBolt,
  FaBookOpen,
  FaBrain,
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaChartLine,
  FaCoins,
  FaCrown,
  FaFileInvoice,
  FaFire,
  FaGraduationCap,
  FaLayerGroup,
  FaPlayCircle,
  FaRegClock,
  FaRocket,
  FaShieldAlt,
  FaStar,
  FaTrophy,
  FaUserGraduate,
  FaUsers,
} from 'react-icons/fa';
import { browseService, subscriptionService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PaymentModal from '../components/PaymentModal';
import { AmbientPage, EmptyState, GlassPanel, PageHeader, SectionTitle, TinyTrend, fadeUp } from '../components/enterprise/Ui';

const Counter = ({ value, suffix = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame;
    let start;
    const duration = 1200;
    const tick = (time) => {
      if (!start) start = time;
      const progress = Math.min((time - start) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

const FeatureCard = ({ icon, title, description, accent }) => (
  <GlassPanel className="rounded-[28px] p-6">
    <div className={`mb-5 inline-flex rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-3 text-lg text-white`}>
      {icon}
    </div>
    <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
  </GlassPanel>
);

const PlanCard = ({ plan, active, onChoose }) => (
  <motion.div
    whileHover={{ y: -6 }}
    className={`relative overflow-hidden rounded-[30px] border p-6 ${
      active
        ? 'border-indigo-400/40 bg-gradient-to-br from-indigo-500/16 via-fuchsia-500/10 to-cyan-400/10 shadow-[0_18px_60px_rgba(79,70,229,0.18)]'
        : 'border-white/8 bg-white/[0.03]'
    }`}
  >
    {plan.badge ? (
      <div className="badge badge-amber absolute right-5 top-5">{plan.badge}</div>
    ) : null}
    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
      {plan.name}
    </div>
    <div className="mt-4 flex items-end gap-2">
      <div className="text-4xl font-black tracking-tight text-[var(--text-primary)]">{plan.price}</div>
      <div className="pb-1 text-sm text-[var(--text-muted)]">/{plan.period}</div>
    </div>
    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{plan.description}</p>
    <div className="mt-5 space-y-3">
      {plan.features.map((feature) => (
        <div key={feature} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
          <span className="mt-0.5 text-emerald-300">
            <FaCheck />
          </span>
          <span>{feature}</span>
        </div>
      ))}
    </div>
    <button
      onClick={() => onChoose(plan)}
      className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
        active
          ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white'
          : 'border border-white/10 bg-white/[0.04] text-[var(--text-primary)] hover:border-indigo-400/30 hover:bg-indigo-400/10'
      }`}
    >
      Choose {plan.name}
    </button>
  </motion.div>
);

const FAQItem = ({ item, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      {...fadeUp}
      transition={{ ...fadeUp.transition, delay: index * 0.05 }}
      className={`overflow-hidden rounded-[24px] border ${open ? 'border-indigo-400/30 bg-indigo-400/10' : 'border-white/8 bg-white/[0.03]'}`}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
      >
        <span className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">{item.question}</span>
        <span className="shrink-0 text-indigo-300">{open ? <FaChevronUp /> : <FaChevronDown />}</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/8"
          >
            <p className="px-5 py-4 text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

const Home = () => {
  const { user, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ exam_count: 0, subject_count: 0, chapter_count: 0, question_count: 0 });
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState('');
  const [apiPlans, setApiPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      browseService.getStats().catch(() => ({ exam_count: 36, subject_count: 112, chapter_count: 640, question_count: 18500 })),
      browseService.getReport().catch(() => ({ exam_map: [] })),
      subscriptionService.getPlans().catch(() => ({ plans: [] })),
    ]).then(([statsData, reportData, plansData]) => {
      if (!active) return;
      setStats(statsData);
      setCatalog(reportData.exam_map || []);
      setApiPlans(plansData.plans || []);
    });
    return () => {
      active = false;
    };
  }, []);

  const plans = useMemo(
    () =>
      apiPlans.length
        ? apiPlans.map((p) => ({
            name: p.name,
            slug: p.slug,
            period: billingCycle,
            price: `₹${billingCycle === 'monthly' ? p.monthly_price : p.yearly_price}`,
            description: p.features_json?.description || `${p.name} plan for exam preparation.`,
            features: (p.features || []).filter((f) => f.is_enabled).map((f) => f.feature_name).slice(0, 4),
            badge: p.slug === 'premium' ? 'Most Popular' : null,
          }))
        : [
            { name: 'FREE', slug: 'free', period: 'month', price: '₹0', description: 'Basic tests only.', features: ['Daily quiz', 'Bookmarks', 'Basic dashboard'] },
            { name: 'PRO', slug: 'pro', period: 'month', price: '₹149', description: 'For serious aspirants.', features: ['Premium tests', 'Mock tests', 'Analytics'] },
            { name: 'PREMIUM', slug: 'premium', period: 'month', price: '₹299', badge: 'Most Popular', description: 'Advanced reports.', features: ['Advanced reports', 'Premium dashboard', 'Premium badge'] },
            { name: 'ULTIMATE', slug: 'ultimate', period: 'month', price: '₹499', description: 'Everything unlimited.', features: ['AI features', 'Premium themes', 'Priority support'] },
          ],
    [apiPlans, billingCycle]
  );

  const handleChoosePlan = (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (plan.slug === 'free') {
      subscriptionService.subscribe('free').then(() => refreshSubscription?.());
      return;
    }
    setCheckoutPlan({ slug: plan.slug, billingCycle });
  };

  const filteredExams = useMemo(() => {
    if (!search.trim()) return catalog.slice(0, 6);
    const query = search.toLowerCase();
    return catalog.filter((exam) => exam.exam_name.toLowerCase().includes(query) || exam.category.toLowerCase().includes(query)).slice(0, 6);
  }, [catalog, search]);

  const features = [
    {
      icon: <FaRocket />,
      title: 'Commercial-grade practice engine',
      description: 'Chapter practice, subject practice, daily quizzes, previous year flows, and resume support in one premium interface.',
      accent: 'from-indigo-500 to-cyan-400',
    },
    {
      icon: <FaBrain />,
      title: 'Result intelligence built for winners',
      description: 'Subject, chapter, difficulty, and time analysis help you understand not just what happened, but what to do next.',
      accent: 'from-fuchsia-500 to-indigo-500',
    },
    {
      icon: <FaShieldAlt />,
      title: 'Mock tests that feel like the real exam',
      description: 'Immersive timer, fullscreen readiness, question palette, autosave, and negative marking built for pressure.',
      accent: 'from-emerald-500 to-cyan-400',
    },
    {
      icon: <FaLayerGroup />,
      title: 'Premium exam catalog',
      description: 'Engineering, medical, government, banking, railways, state exams, and custom mock experiences from a unified backend.',
      accent: 'from-amber-500 to-rose-500',
    },
  ];

  const testimonials = [
    {
      name: 'Aarav Mehta',
      role: 'JEE Main 99.1 percentile',
      quote: 'The mock interface felt closer to my actual exam than any coaching portal I used. My timing discipline improved in two weeks.',
    },
    {
      name: 'Priyanka Das',
      role: 'SSC CGL aspirant',
      quote: 'The weak-topic detection and chapter review cards made revision decisions obvious. I stopped wasting time on chapters I had already mastered.',
    },
    {
      name: 'Ritvik Sharma',
      role: 'NEET repeat candidate',
      quote: 'ExamSIDE finally made my study routine look and feel serious. It gave me the confidence of using a funded startup product, not a patchwork app.',
    },
  ];

  const faqs = [
    {
      question: 'Does ExamSIDE support both practice and full mock exams?',
      answer: 'Yes. The platform supports chapter practice, subject practice, previous year question flows, daily and weekly quizzes, custom mocks, and scheduled full-length tests.',
    },
    {
      question: 'Can I resume a test if my internet drops or I leave accidentally?',
      answer: 'The enterprise exam interface is built with autosave and resume support. Your answer state, palette state, bookmarks, and time usage are persisted for recovery.',
    },
    {
      question: 'How do premium plans differ from the free tier?',
      answer: 'Premium tiers unlock more mock volume, stronger analytics, downloadable scorecards, richer revision tools, and performance features intended for serious aspirants.',
    },
    {
      question: 'Is the exam engine aligned with actual negative marking patterns?',
      answer: 'Yes. The backend stores exam settings like positive marks, negative marks, duration, difficulty, and shuffle behavior, and the frontend consumes those configurations.',
    },
  ];

  const compareRows = [
    ['Premium tests', 'No', 'Yes', 'Yes', 'Yes'],
    ['Mock tests', 'No', 'Yes', 'Yes', 'Yes'],
    ['Advanced analytics', 'No', 'Yes', 'Yes', 'Yes'],
    ['Advanced reports', 'No', 'No', 'Yes', 'Yes'],
    ['AI features', 'No', 'No', 'No', 'Yes'],
    ['Priority support', 'No', 'No', 'No', 'Yes'],
  ];

  const paymentHistory = [
    { id: 'INV-2401', plan: 'Pro', amount: '₹699', status: 'Paid', date: '12 Jun 2026' },
    { id: 'INV-2312', plan: 'Gold', amount: '₹399', status: 'Paid', date: '12 May 2026' },
    { id: 'INV-2291', plan: 'Silver', amount: '₹199', status: 'Failed', date: '12 Apr 2026' },
  ];

  return (
    <AmbientPage
      blobs={[
        { key: 'home-indigo', className: 'blob-indigo', style: { top: '-4%', left: '-8%', opacity: 0.15 } },
        { key: 'home-purple', className: 'blob-purple', style: { right: '-8%', top: '12%', opacity: 0.14 } },
        { key: 'home-cyan', className: 'blob-cyan', style: { bottom: '18%', left: '18%', opacity: 0.08 } },
      ]}
    >
      <div className="relative overflow-hidden rounded-[38px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.2),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_28%),rgba(255,255,255,0.02)] px-5 py-10 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:px-8 lg:px-10">
        <div className="noise-overlay absolute inset-0" />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="badge badge-indigo mb-5">
              <FaBolt /> Enterprise Exam Engine 2.0
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="hero-title max-w-4xl text-[var(--text-primary)]"
            >
              A funded-startup feel for every{' '}
              <span className="gradient-text">practice set, mock test, and result screen</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg"
            >
              ExamSIDE brings chapter practice, previous year questions, scheduled mocks, analytics, leaderboards, and premium student workflows into one polished exam platform.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/exams" className="btn-primary">
                Explore Exams <FaArrowRight className="relative z-10" />
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                Open Dashboard
              </Link>
            </motion.div>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { label: 'Mock-ready interface', icon: <FaPlayCircle /> },
                { label: 'Detailed analytics', icon: <FaChartLine /> },
                { label: 'Leaderboards & XP', icon: <FaTrophy /> },
              ].map((pill) => (
                <div key={pill.label} className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <span className="text-indigo-300">{pill.icon}</span>
                  {pill.label}
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="grid gap-4"
          >
            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Live product snapshot" subtitle="A quick feel for how the platform performs." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Question bank</div>
                  <div className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                    <Counter value={stats.question_count || 18500} suffix="+" />
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">Curated practice inventory</div>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Exam coverage</div>
                  <div className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                    <Counter value={stats.exam_count || 36} suffix="+" />
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">National and state-level streams</div>
                </div>
              </div>
              <div className="mt-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Student confidence trend</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">Mock confidence score after repeated timed practice</div>
                  </div>
                  <div className="badge badge-emerald">92% uplift</div>
                </div>
                <div className="mt-3">
                  <TinyTrend points={[32, 40, 39, 48, 55, 62, 68, 76, 81, 88]} stroke="#22d3ee" fill="rgba(34,211,238,0.12)" />
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Why aspirants stay" subtitle="Small details that make the platform feel premium." />
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Question palette', <FaLayerGroup />],
                  ['Autosave + resume', <FaRegClock />],
                  ['XP and coins', <FaCoins />],
                  ['Result intelligence', <FaBrain />],
                ].map(([label, icon]) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    <span className="text-indigo-300">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Students preparing', value: 52000, suffix: '+', icon: <FaUsers /> },
          { label: 'Question sets launched', value: stats.chapter_count || 640, suffix: '+', icon: <FaBookOpen /> },
          { label: 'Mock sessions delivered', value: 218000, suffix: '+', icon: <FaTrophy /> },
          { label: 'Average streak kept', value: 11, suffix: ' days', icon: <FaFire /> },
        ].map((item) => (
          <GlassPanel key={item.label} className="rounded-[28px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{item.label}</div>
                <div className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
                  <Counter value={item.value} suffix={item.suffix} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-indigo-300">{item.icon}</div>
            </div>
          </GlassPanel>
        ))}
      </section>

      <section className="mt-16">
        <PageHeader
          eyebrow="Core Value"
          title="Built around the exam engine, not just content pages"
          description="Every primary surface is designed to support actual exam preparation: fast decision-making, calm timing, and useful performance feedback."
        />
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassPanel className="rounded-[32px] p-6 sm:p-7">
          <SectionTitle title="Popular and trending exams" subtitle="Search the live backend catalog and jump straight into chapter prep or mocks." />
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search JEE, NEET, SSC, Banking..."
              className="input-field max-w-md rounded-2xl"
            />
            <Link to="/subjects" className="btn-secondary">
              Open Subjects
            </Link>
          </div>
          {filteredExams.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredExams.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/subjects?exam_id=${exam.id}`}
                  className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 transition hover:border-indigo-400/30 hover:bg-indigo-400/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{exam.exam_name}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{exam.category}</div>
                      <div className="mt-3 text-xs text-[var(--text-secondary)]">
                        {(exam.subjects || []).length} subjects ready for chapter-level practice
                      </div>
                    </div>
                    <span className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-indigo-300">
                      <FaArrowRight />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FaGraduationCap />}
              title="No exams match that search"
              description="Try another category or spelling. The exam list is pulled from the existing backend catalog."
            />
          )}
        </GlassPanel>

        <GlassPanel className="rounded-[32px] p-6 sm:p-7">
          <SectionTitle title="Trending categories" subtitle="High-demand verticals students keep returning to." />
          <div className="space-y-3">
            {[
              ['Engineering', 'JEE Main, JEE Advanced, GATE', '#6366f1'],
              ['Medical', 'NEET, AIIMS-style practice', '#10b981'],
              ['Government', 'UPSC, SSC, state service', '#f59e0b'],
              ['Banking & Railways', 'IBPS, SBI, RRB', '#22d3ee'],
            ].map(([title, subtitle, color]) => (
              <div key={title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
                    <div className="text-xs text-[var(--text-muted)]">{subtitle}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>

      <section className="mt-16">
        <PageHeader
          eyebrow="Student Reviews"
          title="Aspirants describe it like a product they want to keep open"
          description="Not just another practice site. The interface, timer discipline, and result depth change how students feel while preparing."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {testimonials.map((item) => (
            <GlassPanel key={item.name} className="rounded-[30px] p-6">
              <div className="mb-4 flex items-center gap-1 text-amber-300">
                {Array.from({ length: 5 }).map((_, index) => (
                  <FaStar key={index} />
                ))}
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">"{item.quote}"</p>
              <div className="mt-5 border-t border-white/8 pt-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{item.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{item.role}</div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <PageHeader
          eyebrow="Subscription"
          title="Plans, upgrade flow, invoices, and payments"
          description="Choose FREE, PRO, PREMIUM, or ULTIMATE — connected to real Razorpay checkout."
        />
        <div className="pricing-toggle mb-6 flex justify-center gap-2">
          <button onClick={() => setBillingCycle('monthly')} className={`rounded-full px-5 py-2 text-sm font-semibold ${billingCycle === 'monthly' ? 'bg-indigo-500 text-white' : 'border border-white/10'}`}>Monthly</button>
          <button onClick={() => setBillingCycle('yearly')} className={`rounded-full px-5 py-2 text-sm font-semibold ${billingCycle === 'yearly' ? 'bg-indigo-500 text-white' : 'border border-white/10'}`}>Yearly</button>
        </div>
        <div className="grid gap-5 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              active={plan.slug === 'premium'}
              onChoose={() => handleChoosePlan(plan)}
            />
          ))}
        </div>

        <GlassPanel className="mt-6 rounded-[32px] p-6">
          <SectionTitle title="Feature comparison" subtitle="A quick flat compare so the upgrade path feels transparent." />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/8 text-[var(--text-muted)]">
                  <th className="px-3 py-3 font-semibold">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.name} className="px-3 py-3 font-semibold">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row[0]} className="border-b border-white/6 last:border-b-0">
                    {row.map((cell, index) => (
                      <td key={`${row[0]}-${index}`} className="px-3 py-3 text-[var(--text-secondary)]">
                        {index === 0 ? <span className="font-medium text-[var(--text-primary)]">{cell}</span> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <GlassPanel className="rounded-[32px] p-6">
          <SectionTitle title="Payment history & invoice previews" subtitle="Designed UI states for billing, history, and invoice access." />
          <div className="space-y-3">
            {paymentHistory.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{item.id}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.plan} • {item.date}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'Paid' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                    {item.status}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{item.amount}</span>
                  <button className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-indigo-300">
                    <FaFileInvoice />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="rounded-[32px] p-6">
          <SectionTitle title="FAQ" subtitle="Important product questions answered clearly." />
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FAQItem key={faq.question} item={faq} index={index} />
            ))}
          </div>
        </GlassPanel>
      </section>

      <section className="mt-16">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[36px] border border-indigo-400/20 bg-gradient-to-br from-indigo-500/16 via-fuchsia-500/10 to-cyan-400/12 px-6 py-10 text-center sm:px-10"
        >
          <div className="noise-overlay absolute inset-0" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="badge badge-emerald mb-5 inline-flex">
              <FaRocket /> Start your next scoring climb
            </div>
            <h2 className="section-title text-[var(--text-primary)]">
              Built to make practice feel focused, premium, and worth returning to every day
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--text-secondary)]">
              Move from exploration to serious preparation with a frontend designed around momentum, clarity, and actual exam conditions.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/login" className="btn-primary">
                Join ExamSIDE <FaArrowRight className="relative z-10" />
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                See Student Dashboard
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {checkoutPlan && (
        <PaymentModal
          planSlug={checkoutPlan.slug}
          billingCycle={checkoutPlan.billingCycle}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={() => { setCheckoutPlan(null); refreshSubscription?.(); navigate('/payment-success'); }}
        />
      )}
    </AmbientPage>
  );
};

export default Home;
