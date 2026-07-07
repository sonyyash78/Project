import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowRight,
  FaBolt,
  FaBookOpen,
  FaBrain,
  FaCalendarAlt,
  FaChartLine,
  FaClock,
  FaCoins,
  FaCrown,
  FaFire,
  FaGem,
  FaLayerGroup,
  FaPlayCircle,
  FaRocket,
  FaShieldAlt,
  FaStar,
  FaTrophy,
} from 'react-icons/fa';
import { browseService, examEngineService, progressService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import {
  AmbientPage,
  EmptyState,
  GlassPanel,
  MetricCard,
  PageHeader,
  ProgressBar,
  SectionTitle,
  SegmentedRing,
  StatList,
  TinyTrend,
} from '../components/enterprise/Ui';
import toast from 'react-hot-toast';

const subscriptionPlans = {
  free: {
    title: 'Free Explorer',
    accent: 'from-slate-500/20 to-slate-200/5',
    blurb: 'Basic practice, limited mocks, and your daily streak tracker.',
  },
  pro: {
    title: 'PRO',
    accent: 'from-blue-500/25 to-cyan-500/10',
    blurb: 'Premium tests, mock exams, analytics, and bookmarks.',
  },
  premium: {
    title: 'PREMIUM',
    accent: 'from-purple-500/30 to-fuchsia-500/10',
    blurb: 'Advanced reports, premium dashboard, and premium badge.',
  },
  ultimate: {
    title: 'ULTIMATE',
    accent: 'from-amber-500/30 to-orange-500/10',
    blurb: 'AI features, premium themes, and priority support.',
  },
};

const deriveCoins = (score = 0, accuracy = 0) => Math.max(50, Math.round(score * 2 + accuracy));
const deriveXp = (attempts = 0, accuracy = 0) => Math.max(120, Math.round(attempts * 85 + accuracy * 6));

const Dashboard = () => {
  const { user, subscription } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [report, setReport] = useState(null);
  const [continueAttempt, setContinueAttempt] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const attemptId = localStorage.getItem('examside_last_attempt_id');
    const attemptMode = localStorage.getItem('examside_last_attempt_mode');
    if (attemptId) {
      setContinueAttempt({ id: attemptId, mode: attemptMode || 'practice' });
    }

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [progress, analyticsBundle, upcoming, board, reportBundle] = await Promise.all([
          progressService.getDashboard(),
          examEngineService.getAnalyticsDashboard().catch(() => null),
          examEngineService.getUpcomingNotifications(72).catch(() => []),
          examEngineService.getLeaderboard({ scope: 'global', limit: 8 }).catch(() => progressService.getLeaderboard()),
          browseService.getReport().catch(() => null),
        ]);

        setDashboardData(progress);
        setAnalytics(analyticsBundle);
        setNotifications(Array.isArray(upcoming) ? upcoming : []);
        setLeaderboard(Array.isArray(board) ? board : []);
        setReport(reportBundle);
      } catch (error) {
        console.error(error);
        toast.error('Unable to load your dashboard right now.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate, user]);

  const trends = useMemo(() => {
    const dash = analytics?.dashboard;
    return {
      accuracy: (dash?.accuracy_trend || []).map((item) => item.accuracy || 0),
      score: (dash?.score_trend || []).map((item) => item.score || 0),
    };
  }, [analytics]);

  if (!user) return null;

  if (loading || !dashboardData) {
    return (
      <AmbientPage
        blobs={[
          { key: 'dashboard-indigo', className: 'blob-indigo', style: { top: '2%', left: '-8%', opacity: 0.14 } },
          { key: 'dashboard-cyan', className: 'blob-cyan', style: { right: '-8%', bottom: '2%', opacity: 0.12 } },
        ]}
      >
        <DashboardSkeleton />
      </AmbientPage>
    );
  }

  const profilePlan = subscriptionPlans[(subscription?.plan_slug || user.subscription_plan || 'free').toLowerCase()] || subscriptionPlans.free;
  const stats = analytics?.statistics || {};
  const recommendedExams = report?.exam_map?.slice(0, 4) || [];
  const weakChapters = dashboardData.weak_chapters || [];
  const strongChapters = dashboardData.strong_chapters || [];
  const recentActivity = dashboardData.recent_activity || [];
  const currentUserLeaderboard =
    leaderboard.find((entry) => entry.email === user.email || entry.user_id === user.id) || null;
  const xp = currentUserLeaderboard?.xp ?? deriveXp(dashboardData.total_tests_attempted, dashboardData.overall_accuracy);
  const coins = currentUserLeaderboard?.coins ?? deriveCoins(dashboardData.average_score, dashboardData.overall_accuracy);
  const streakGoal = Math.min(100, ((dashboardData.streak || 0) / 7) * 100);
  const weeklyProgress = analytics?.dashboard?.weekly_progress || [];
  const subjectComparison = analytics?.dashboard?.subject_comparison || [];
  const difficultyComparison = analytics?.dashboard?.difficulty_comparison || [];

  return (
    <AmbientPage
      blobs={[
        { key: 'dashboard-indigo', className: 'blob-indigo', style: { top: '0%', left: '-8%', opacity: 0.12 } },
        { key: 'dashboard-purple', className: 'blob-purple', style: { top: '26%', right: '-10%', opacity: 0.12 } },
        { key: 'dashboard-cyan', className: 'blob-cyan', style: { bottom: '8%', left: '18%', opacity: 0.08 } },
      ]}
    >
      <PageHeader
        eyebrow={`Welcome back, ${user.name}`}
        title="A premium command center for your exam preparation"
        description="Track streaks, resume live practice, monitor weak chapters, and plan your next scoring jump from one enterprise dashboard."
        actions={
          <>
            <Link to="/subjects" className="btn-secondary">
              Browse Subjects
            </Link>
            <Link to="/exams" className="btn-primary">
              Start Mock <FaArrowRight className="relative z-10" />
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<FaGem />} label="XP" value={xp.toLocaleString()} hint="Momentum from practice and mock performance" accent="from-indigo-500/20 via-violet-500/10 to-cyan-400/5" />
        <MetricCard icon={<FaCoins />} label="Coins" value={coins.toLocaleString()} hint="Spendable perks and reward points" accent="from-amber-500/25 via-orange-400/10 to-rose-400/5" iconClassName="text-amber-300" />
        <MetricCard icon={<FaFire />} label="Streak" value={`${dashboardData.streak} days`} hint="Keep one attempt a day to protect your heat" accent="from-rose-500/20 via-orange-400/10 to-amber-300/5" iconClassName="text-rose-300" />
        <MetricCard icon={<FaTrophy />} label="Average Accuracy" value={`${Math.round(dashboardData.overall_accuracy || 0)}%`} hint={`${dashboardData.total_tests_attempted} tests completed`} accent="from-emerald-500/20 via-cyan-400/10 to-indigo-400/5" iconClassName="text-emerald-300" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <GlassPanel className="rounded-[30px] p-6 sm:p-7">
            <SectionTitle
              title="Today's Mission"
              subtitle="A crisp action plan built from your latest trendline."
              action={<span className="badge badge-emerald">Daily Goal</span>}
            />
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/8 bg-gradient-to-br from-indigo-500/12 via-white/[0.02] to-cyan-400/8 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-3 text-indigo-300">
                      <FaRocket />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {dashboardData.overall_accuracy >= 70 ? 'Push for rank accuracy' : 'Sharpen weak concept retention'}
                      </div>
                      <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                        {dashboardData.overall_accuracy >= 70
                          ? 'Your base is strong. Focus on timed mocks and minimize avoidable negatives.'
                          : 'Spend 20 minutes on weak chapters, then validate with a short timed set.'}
                      </p>
                    </div>
                  </div>
                </div>
                <ProgressBar
                  label="7-day streak goal"
                  value={streakGoal}
                  color="#fb7185"
                  meta={`${dashboardData.streak}/7 days`}
                />
                <ProgressBar
                  label="Weekly practice minutes"
                  value={Math.min(100, ((stats.total_time_seconds || 0) / 7200) * 100)}
                  color="#22d3ee"
                  meta={`${Math.round((stats.total_time_seconds || 0) / 60)} min`}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => navigate('/test?test_type=practice')}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:border-indigo-400/30 hover:bg-indigo-400/10"
                  >
                    <div className="flex items-center gap-3">
                      <FaPlayCircle className="text-indigo-300" />
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">Quick Practice</div>
                        <div className="text-xs text-[var(--text-muted)]">Start a rapid chapter session</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate('/exams')}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
                  >
                    <div className="flex items-center gap-3">
                      <FaLayerGroup className="text-emerald-300" />
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">Recommended Exams</div>
                        <div className="text-xs text-[var(--text-muted)]">See high-fit mock categories</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <SegmentedRing
                  value={dashboardData.overall_accuracy || 0}
                  label="Current form"
                  sublabel="Accuracy is trending off your last attempts. Keep your timing steady."
                  color="#6366f1"
                />
                <div className="mt-5">
                  <StatList
                    items={[
                      { label: 'Correct answers', value: dashboardData.totals?.correct ?? 0 },
                      { label: 'Wrong answers', value: dashboardData.totals?.incorrect ?? 0 },
                      { label: 'Skipped', value: dashboardData.totals?.skipped ?? 0 },
                    ]}
                  />
                </div>
              </div>
            </div>
          </GlassPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Continue Last Exam" subtitle="Persistent attempt state lets you jump back in." />
              {continueAttempt ? (
                <div className="rounded-[24px] border border-indigo-400/20 bg-indigo-400/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">Resume Ready</div>
                      <div className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                        {continueAttempt.mode.replace(/_/g, ' ')}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        Your most recent enterprise attempt is saved locally and can be resumed in the test interface.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-indigo-400/20 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-indigo-300">
                      #{continueAttempt.id}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/test?attempt_id=${continueAttempt.id}&resume=1`)}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white"
                  >
                    Resume Attempt <FaArrowRight />
                  </button>
                </div>
              ) : (
                <EmptyState
                  icon={<FaClock />}
                  title="No resumable attempt yet"
                  description="Your in-progress chapter practice and mock tests will appear here once you start using resume-ready mode."
                />
              )}
            </GlassPanel>

            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Subscription" subtitle="Plan status, perks, and upgrade path." />
              <div className={`rounded-[24px] border border-white/8 bg-gradient-to-br ${profilePlan.accent} p-5`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="badge badge-amber mb-3">
                      <FaCrown /> Active Plan
                    </div>
                    <div className="text-xl font-black text-[var(--text-primary)]">{profilePlan.title}</div>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">{profilePlan.blurb}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-amber-300">
                    <FaShieldAlt />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Expires</div>
                    <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'No expiry'}
                      {subscription?.days_remaining != null && subscription.days_remaining < 9999 && (
                        <span className="ml-2 text-xs text-amber-300">({subscription.days_remaining} days left)</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Billing</div>
                    <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {subscription?.billing_cycle ? subscription.billing_cycle.charAt(0).toUpperCase() + subscription.billing_cycle.slice(1) : 'Free tier'}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => navigate('/pricing')} className="btn-primary text-sm">Upgrade Plan</button>
                  {subscription?.plan_slug && subscription.plan_slug !== 'free' && (
                    <button onClick={() => navigate('/profile?tab=subscription')} className="btn-secondary text-sm">Manage Subscription</button>
                  )}
                </div>
              </div>
            </GlassPanel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Recommended Exams" subtitle="Curated from your current catalog and study behavior." />
              <div className="grid gap-3">
                {recommendedExams.length ? (
                  recommendedExams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => navigate(`/subjects?exam_id=${exam.id}`)}
                      className="flex items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{exam.exam_name}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {exam.category} • {exam.subjects?.length || 0} subjects
                        </div>
                      </div>
                      <FaArrowRight className="shrink-0 text-[var(--text-muted)]" />
                    </button>
                  ))
                ) : (
                  <EmptyState
                    icon={<FaBookOpen />}
                    title="No catalog suggestions available"
                    description="Add more exams to the backend catalog to surface personalized picks here."
                  />
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Upcoming Mock Tests" subtitle="Scheduled mocks and live exam reminders." />
              <div className="space-y-3">
                {notifications.length ? (
                  notifications.slice(0, 4).map((item, index) => (
                    <div
                      key={`${item.exam_id || item.message}-${index}`}
                      className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-300">
                          <FaCalendarAlt />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {item.exam_name || item.message}
                          </div>
                          <div className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
                            {item.scheduled_start_at
                              ? new Date(item.scheduled_start_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : 'Daily reminder and performance nudge'}
                          </div>
                          <div className="mt-2 inline-flex rounded-full border border-white/8 bg-slate-950/40 px-3 py-1 text-[11px] text-[var(--text-secondary)]">
                            {item.live_mode_enabled ? 'Live mock ready' : 'Mock reminder'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={<FaCalendarAlt />}
                    title="No scheduled mocks yet"
                    description="Once admins configure scheduled or live mocks, your reminders will show up here."
                  />
                )}
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Recent Activity" subtitle="Your latest attempts, scores, and response quality." />
            <div className="grid gap-3">
              {recentActivity.length ? (
                recentActivity.map((attempt) => (
                  <button
                    key={attempt.attempt_id}
                    onClick={() => navigate(`/result/${attempt.attempt_id}`)}
                    className="flex flex-col gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-indigo-400/30 hover:bg-indigo-400/10 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{attempt.title}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {new Date(attempt.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                        {Math.round(attempt.accuracy)}% accuracy
                      </span>
                      <span className="rounded-full border border-white/8 bg-slate-950/40 px-3 py-1 text-[var(--text-secondary)]">
                        {Math.round(attempt.score)} / {Math.round(attempt.total)}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState
                  icon={<FaChartLine />}
                  title="No attempts recorded"
                  description="Start a chapter practice or mock exam and your activity feed will populate here."
                />
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Performance Trend" subtitle="Accuracy and score momentum over recent tests." />
            <div className="grid gap-5">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Accuracy</div>
                  <div className="text-xs font-semibold text-indigo-300">
                    {Math.round(dashboardData.overall_accuracy || 0)}%
                  </div>
                </div>
                <TinyTrend points={trends.accuracy} stroke="#818cf8" fill="rgba(99,102,241,0.15)" />
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Score</div>
                  <div className="text-xs font-semibold text-emerald-300">
                    {Math.round(dashboardData.average_score || 0)} avg
                  </div>
                </div>
                <TinyTrend points={trends.score} stroke="#34d399" fill="rgba(16,185,129,0.14)" />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Subject Accuracy" subtitle="Best view of concept strength by subject cluster." />
            <div className="space-y-4">
              {subjectComparison.length ? (
                subjectComparison.slice(0, 5).map((item) => (
                  <ProgressBar
                    key={item.subject}
                    label={item.subject}
                    value={item.accuracy}
                    color="#22d3ee"
                    meta={`${Math.round(item.accuracy)}%`}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<FaBookOpen />}
                  title="Subject analytics are warming up"
                  description="Submit a few more mixed attempts to unlock reliable subject comparison."
                />
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Weak Chapters" subtitle="Priority chapters that need another revision cycle." />
            <div className="space-y-4">
              {weakChapters.length ? (
                weakChapters.map((item) => (
                  <ProgressBar
                    key={item.chapter_id}
                    label={item.name}
                    value={item.accuracy}
                    color="#fb7185"
                    meta={`${Math.round(item.accuracy)}%`}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<FaStar />}
                  title="No weak chapters detected"
                  description="Your recent attempt pattern has not surfaced any chapter under the weak threshold."
                />
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Strong Chapters" subtitle="Your current high-confidence zones." />
            <div className="space-y-4">
              {strongChapters.length ? (
                strongChapters.map((item) => (
                  <ProgressBar
                    key={item.chapter_id}
                    label={item.name}
                    value={item.accuracy}
                    color="#34d399"
                    meta={`${Math.round(item.accuracy)}%`}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<FaBolt />}
                  title="Strong chapter list is still forming"
                  description="Push a few more attempts and we’ll identify your dependable scoring areas."
                />
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Leaderboard Preview" subtitle="Global momentum and your rank snapshot." />
            <div className="space-y-3">
              {leaderboard.length ? (
                leaderboard.slice(0, 5).map((entry) => (
                  <div
                    key={`${entry.rank}-${entry.user_id || entry.email}`}
                    className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 text-sm font-black text-[var(--text-primary)]">
                      {entry.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{entry.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {Math.round(entry.accuracy || entry.avg_accuracy || 0)}% accuracy
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-indigo-300">
                        {Math.round(entry.score || entry.total_score || 0)}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">{entry.tests_taken} tests</div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<FaTrophy />}
                  title="Leaderboard unavailable"
                  description="The ranking feed will appear here when enough submitted attempts exist."
                />
              )}
              {currentUserLeaderboard ? (
                <div className="rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                  You are currently ranked #{currentUserLeaderboard.rank} with {Math.round(currentUserLeaderboard.score)} score points.
                </div>
              ) : null}
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="AI Recommendation Card" subtitle="Placeholder connected to real analytics until AI is enabled." />
            <div className="rounded-[24px] border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/12 via-indigo-500/10 to-cyan-400/10 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-3 text-fuchsia-300">
                  <FaBrain />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Next best move</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Based on your current streak, difficulty mix, and subject accuracy, the best next session is a timed medium-difficulty set focused on
                    {' '}
                    {(weakChapters[0]?.name || subjectComparison[0]?.subject || 'your lowest-performing chapter')}
                    .
                  </p>
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Time Spent & Difficulty Mix" subtitle="A compact read on where your effort is going." />
            <div className="space-y-4">
              <ProgressBar
                label="Total time invested"
                value={Math.min(100, ((stats.total_time_seconds || 0) / 14400) * 100)}
                color="#6366f1"
                meta={`${Math.round((stats.total_time_seconds || 0) / 3600)} hrs`}
              />
              {difficultyComparison.length ? (
                difficultyComparison.slice(0, 3).map((item) => (
                  <ProgressBar
                    key={item.difficulty}
                    label={item.difficulty || 'Unknown'}
                    value={item.accuracy}
                    color="#f59e0b"
                    meta={`${item.total} questions`}
                  />
                ))
              ) : null}
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-xs leading-6 text-[var(--text-secondary)]">
                {weeklyProgress.length
                  ? `You have logged ${weeklyProgress.length} timed sessions this week. Keep the cadence steady to preserve score momentum.`
                  : 'Timed session analytics will deepen once this week has at least one submitted attempt.'}
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </AmbientPage>
  );
};

export default Dashboard;
