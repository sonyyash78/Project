import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaChartLine,
  FaBullseye,
  FaClock,
  FaBolt,
  FaFire,
  FaBookOpen,
  FaLayerGroup,
  FaCalendarAlt,
  FaTrophy,
  FaStar,
  FaChartBar,
  FaChartArea,
} from 'react-icons/fa';

import { examEngineService } from '../api/api';
import {
  AmbientPage,
  GlassPanel,
  MetricCard,
  PageHeader,
  ProgressBar,
  SectionTitle,
  TinyTrend,
  EmptyState,
  fadeUp,
} from '../components/enterprise/Ui';
import { DashboardSkeleton } from '../components/SkeletonLoader';

/* ─── colour palette ─── */
const COLORS = {
  indigo: '#6366f1',
  cyan: '#22d3ee',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  sky: '#38bdf8',
  pink: '#ec4899',
  lime: '#84cc16',
  teal: '#14b8a6',
};

const COLOR_WHEEL = Object.values(COLORS);

const pickColor = (index) => COLOR_WHEEL[index % COLOR_WHEEL.length];

/* ─── helpers ─── */
const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '0 min';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
};

const stagger = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, margin: '-60px' },
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  },
};

const childFade = {
  variants: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  },
};

/* ─── ambient blobs ─── */
const BLOBS = [
  { key: 'analytics-indigo', className: 'blob-indigo', style: { top: '0%', left: '-10%', opacity: 0.15 } },
  { key: 'analytics-cyan', className: 'blob-cyan', style: { right: '-8%', bottom: '4%', opacity: 0.12 } },
  { key: 'analytics-violet', className: 'blob-violet', style: { top: '40%', right: '-12%', opacity: 0.1 } },
];

/* ═══════════════════════════════════════════════════
   Activity Heatmap — last 30 days
   ═══════════════════════════════════════════════════ */
const ActivityHeatmap = ({ weeklyProgress = [], monthlyProgress = [] }) => {
  const today = new Date();
  const dayMap = useMemo(() => {
    const map = {};
    [...weeklyProgress, ...monthlyProgress].forEach((entry) => {
      const key = entry.date || entry.day;
      if (!key) return;
      const dateStr = new Date(key).toISOString().slice(0, 10);
      map[dateStr] = (map[dateStr] || 0) + 1;
    });
    return map;
  }, [weeklyProgress, monthlyProgress]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      arr.push({ key, count: dayMap[key] || 0, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayMap]);

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="grid grid-cols-6 gap-[6px] sm:grid-cols-10">
      {days.map((day) => {
        const intensity = day.count > 0 ? 0.25 + (day.count / maxCount) * 0.75 : 0;
        return (
          <motion.div
            key={day.key}
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: Math.random() * 0.15 }}
            title={`${day.label} — ${day.count} attempt${day.count !== 1 ? 's' : ''}`}
            className="group relative flex aspect-square items-center justify-center rounded-lg border border-white/8 text-[10px] font-medium transition-all hover:scale-110 hover:border-white/20"
            style={{
              background: intensity > 0
                ? `rgba(99,102,241,${intensity})`
                : 'rgba(255,255,255,0.03)',
            }}
          >
            <span className="text-[var(--text-muted)] opacity-70 group-hover:opacity-100">
              {day.label.split(' ')[1]}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Progress Scores List
   ═══════════════════════════════════════════════════ */
const ProgressScores = ({ data = [], label }) => {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-6 text-center text-xs text-[var(--text-muted)]">
        No {label} data yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((entry, i) => {
        const dateStr = entry.date || entry.day || `Attempt ${i + 1}`;
        const score = entry.score ?? entry.accuracy ?? 0;
        return (
          <motion.div
            key={`${dateStr}-${i}`}
            {...childFade}
            className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5"
          >
            <span className="text-xs text-[var(--text-secondary)]">
              {typeof dateStr === 'string' && dateStr.includes('-')
                ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : dateStr}
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{Math.round(score)}%</span>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */
const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await examEngineService.getAnalyticsDashboard();
        setDashboard(res?.dashboard || null);
        setStatistics(res?.statistics || null);
      } catch {
        setDashboard(null);
        setStatistics(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* — derived data — */
  const trends = useMemo(() => ({
    accuracy: (dashboard?.accuracy_trend || []).map((item) => item.accuracy ?? item.value ?? 0),
    score: (dashboard?.score_trend || []).map((item) => item.score ?? item.value ?? 0),
  }), [dashboard]);

  const subjects = dashboard?.subject_comparison || [];
  const chapters = dashboard?.chapter_comparison || [];
  const difficulties = dashboard?.difficulty_comparison || [];
  const weekly = dashboard?.weekly_progress || [];
  const monthly = dashboard?.monthly_progress || [];

  const stats = statistics || {};
  const noData = !dashboard && !statistics;

  /* — loading — */
  if (loading) {
    return (
      <AmbientPage blobs={BLOBS}>
        <DashboardSkeleton />
      </AmbientPage>
    );
  }

  /* — empty — */
  if (noData) {
    return (
      <AmbientPage blobs={BLOBS}>
        <PageHeader
          eyebrow="Analytics"
          title="Your Performance"
          description="Dive into deep insights about your preparation journey."
        />
        <EmptyState
          icon={<FaChartLine />}
          title="No analytics available"
          description="Complete a few tests to see your performance analytics light up here."
        />
      </AmbientPage>
    );
  }

  return (
    <AmbientPage blobs={BLOBS}>
      {/* ─── Header ─── */}
      <PageHeader
        eyebrow="Analytics"
        title="Performance Insights"
        description="Track every dimension of your preparation — accuracy, speed, strengths, and trends — all in one place."
      />

      {/* ═══ 1. Hero Stats Row ═══ */}
      <motion.div {...stagger} className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div {...childFade}>
          <MetricCard
            icon={<FaTrophy />}
            label="Total Tests"
            value={stats.total_attempts ?? dashboard?.total_attempts ?? 0}
            hint="Attempts completed"
            accent="from-indigo-500/20 to-violet-400/5"
            iconClassName="text-indigo-300"
          />
        </motion.div>
        <motion.div {...childFade}>
          <MetricCard
            icon={<FaBullseye />}
            label="Avg Accuracy"
            value={`${Math.round(stats.average_accuracy || 0)}%`}
            hint="Across all attempts"
            accent="from-emerald-500/20 to-cyan-400/5"
            iconClassName="text-emerald-300"
          />
        </motion.div>
        <motion.div {...childFade}>
          <MetricCard
            icon={<FaClock />}
            label="Time Spent"
            value={formatTime(stats.total_time_seconds)}
            hint="Total study time"
            accent="from-amber-500/20 to-orange-400/5"
            iconClassName="text-amber-300"
          />
        </motion.div>
        <motion.div {...childFade}>
          <MetricCard
            icon={<FaBolt />}
            label="Avg Speed"
            value={`${Math.round(stats.average_speed || 0)}s`}
            hint="Per question"
            accent="from-rose-500/20 to-pink-400/5"
            iconClassName="text-rose-300"
          />
        </motion.div>
      </motion.div>

      {/* ═══ 2 & 3. Trend Charts ═══ */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <GlassPanel className="rounded-[24px] p-5 sm:p-6">
          <SectionTitle
            title="Accuracy Trend"
            subtitle="Last 10 attempts"
            action={<FaChartArea className="text-indigo-400/60" />}
          />
          {trends.accuracy.length > 0 ? (
            <TinyTrend
              points={trends.accuracy}
              stroke={COLORS.indigo}
              fill="rgba(99,102,241,0.14)"
            />
          ) : (
            <div className="flex h-16 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] text-xs text-[var(--text-muted)]">
              Not enough data
            </div>
          )}
          {trends.accuracy.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>First: {Math.round(trends.accuracy[0])}%</span>
              <span className="font-semibold text-[var(--text-primary)]">
                Latest: {Math.round(trends.accuracy[trends.accuracy.length - 1])}%
              </span>
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="rounded-[24px] p-5 sm:p-6">
          <SectionTitle
            title="Score Trend"
            subtitle="Last 10 attempts"
            action={<FaChartBar className="text-cyan-400/60" />}
          />
          {trends.score.length > 0 ? (
            <TinyTrend
              points={trends.score}
              stroke={COLORS.cyan}
              fill="rgba(34,211,238,0.12)"
            />
          ) : (
            <div className="flex h-16 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] text-xs text-[var(--text-muted)]">
              Not enough data
            </div>
          )}
          {trends.score.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>First: {Math.round(trends.score[0])}</span>
              <span className="font-semibold text-[var(--text-primary)]">
                Latest: {Math.round(trends.score[trends.score.length - 1])}
              </span>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ═══ 4, 5, 6. Comparison Sections ═══ */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Subject */}
        <GlassPanel className="rounded-[24px] p-5 sm:p-6">
          <SectionTitle
            title="Subject Performance"
            subtitle="Accuracy by subject"
            action={<FaBookOpen className="text-violet-400/60" />}
          />
          {subjects.length > 0 ? (
            <motion.div {...stagger} className="space-y-4">
              {subjects.map((s, i) => (
                <motion.div key={s.subject || s.name || i} {...childFade}>
                  <ProgressBar
                    label={s.subject || s.name || `Subject ${i + 1}`}
                    value={s.accuracy ?? s.value ?? 0}
                    color={pickColor(i)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon={<FaBookOpen />}
              title="No subject data"
              description="Take tests across subjects to see comparisons."
            />
          )}
        </GlassPanel>

        {/* Chapter */}
        <GlassPanel className="rounded-[24px] p-5 sm:p-6">
          <SectionTitle
            title="Chapter Breakdown"
            subtitle="Accuracy by chapter"
            action={<FaLayerGroup className="text-emerald-400/60" />}
          />
          {chapters.length > 0 ? (
            <motion.div {...stagger} className="space-y-4">
              {chapters.map((c, i) => (
                <motion.div key={c.chapter || c.name || i} {...childFade}>
                  <ProgressBar
                    label={c.chapter || c.name || `Chapter ${i + 1}`}
                    value={c.accuracy ?? c.value ?? 0}
                    color={pickColor(i + 3)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon={<FaLayerGroup />}
              title="No chapter data"
              description="Complete more tests to see chapter-level insights."
            />
          )}
        </GlassPanel>

        {/* Difficulty */}
        <GlassPanel className="rounded-[24px] p-5 sm:p-6">
          <SectionTitle
            title="Difficulty Analysis"
            subtitle="Accuracy by difficulty"
            action={<FaFire className="text-rose-400/60" />}
          />
          {difficulties.length > 0 ? (
            <motion.div {...stagger} className="space-y-4">
              {difficulties.map((d, i) => {
                const diffColors = { easy: COLORS.emerald, medium: COLORS.amber, hard: COLORS.rose };
                const name = (d.difficulty || d.name || '').toLowerCase();
                return (
                  <motion.div key={d.difficulty || d.name || i} {...childFade}>
                    <ProgressBar
                      label={d.difficulty || d.name || `Level ${i + 1}`}
                      value={d.accuracy ?? d.value ?? 0}
                      color={diffColors[name] || pickColor(i + 6)}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <EmptyState
              icon={<FaFire />}
              title="No difficulty data"
              description="Complete tests with varying difficulty to see breakdowns."
            />
          )}
        </GlassPanel>
      </div>

      {/* ═══ 7. Weekly & Monthly Progress ═══ */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <GlassPanel className="rounded-[24px] p-5 sm:p-6">
          <SectionTitle
            title="Weekly Progress"
            subtitle="Recent 7-day scores"
            action={<FaCalendarAlt className="text-sky-400/60" />}
          />
          <motion.div {...stagger}>
            <ProgressScores data={weekly} label="weekly" />
          </motion.div>
        </GlassPanel>

        <GlassPanel className="rounded-[24px] p-5 sm:p-6">
          <SectionTitle
            title="Monthly Progress"
            subtitle="Performance this month"
            action={<FaStar className="text-amber-400/60" />}
          />
          <motion.div {...stagger}>
            <ProgressScores data={monthly} label="monthly" />
          </motion.div>
        </GlassPanel>
      </div>

      {/* ═══ 8. Activity Heatmap ═══ */}
      <GlassPanel className="mb-8 rounded-[24px] p-5 sm:p-6">
        <SectionTitle
          title="Activity Heatmap"
          subtitle="Last 30 days — brighter means more attempts"
          action={<FaFire className="text-indigo-400/60" />}
        />
        <ActivityHeatmap weeklyProgress={weekly} monthlyProgress={monthly} />
      </GlassPanel>

      {/* ═══ Quick Stats Footer ═══ */}
      <motion.div {...fadeUp}>
        <GlassPanel className="rounded-[24px] p-5 sm:p-6">
          <SectionTitle title="Quick Stats" subtitle="At a glance" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Marked for Review', value: stats.marked_for_review ?? '—', icon: <FaBullseye className="text-amber-400" /> },
              { label: 'Notes Created', value: stats.notes_count ?? '—', icon: <FaBookOpen className="text-violet-400" /> },
              { label: 'Total Attempts', value: stats.total_attempts ?? '—', icon: <FaChartLine className="text-indigo-400" /> },
              { label: 'Avg Speed', value: stats.average_speed ? `${Math.round(stats.average_speed)}s/q` : '—', icon: <FaBolt className="text-rose-400" /> },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-white/14 hover:bg-white/[0.05]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm">
                  {item.icon}
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {item.label}
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-[var(--text-primary)]">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </motion.div>
    </AmbientPage>
  );
};

export default Analytics;
