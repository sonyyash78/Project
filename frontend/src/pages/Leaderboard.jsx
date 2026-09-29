import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBolt,
  FaChevronDown,
  FaCoins,
  FaCrown,
  FaGem,
  FaMedal,
  FaSearch,
  FaTrophy,
  FaUsers,
} from 'react-icons/fa';
import { examEngineService, examService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/SkeletonLoader';
import {
  AmbientPage,
  EmptyState,
  GlassPanel,
  PageHeader,
  SectionTitle,
} from '../components/enterprise/Ui';

/* ─── constants ─── */
const SCOPES = [
  { key: 'global', label: 'Global', icon: <FaUsers /> },
  { key: 'exam', label: 'By Exam', icon: <FaTrophy /> },
];

const PODIUM_CONFIG = [
  {
    place: 1,
    label: '1st',
    icon: <FaCrown />,
    gradient: 'from-amber-400/30 via-yellow-500/20 to-orange-400/10',
    ring: 'ring-amber-400/50',
    iconColor: 'text-amber-300',
    badgeBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    height: 'h-36',
    order: 'order-2',
    scale: 1.08,
  },
  {
    place: 2,
    label: '2nd',
    icon: <FaTrophy />,
    gradient: 'from-slate-300/20 via-gray-400/15 to-slate-500/10',
    ring: 'ring-slate-300/40',
    iconColor: 'text-slate-300',
    badgeBg: 'bg-gradient-to-br from-slate-300 to-gray-400',
    height: 'h-28',
    order: 'order-1',
    scale: 1,
  },
  {
    place: 3,
    label: '3rd',
    icon: <FaMedal />,
    gradient: 'from-orange-400/25 via-amber-600/15 to-orange-700/10',
    ring: 'ring-orange-400/40',
    iconColor: 'text-orange-300',
    badgeBg: 'bg-gradient-to-br from-orange-400 to-amber-600',
    height: 'h-24',
    order: 'order-3',
    scale: 1,
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeRow = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── helpers ─── */
const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const avatarColors = [
  'from-indigo-500 to-cyan-400',
  'from-violet-500 to-fuchsia-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-sky-500 to-blue-400',
  'from-lime-500 to-green-400',
  'from-red-500 to-rose-400',
];

const getAvatarColor = (id) => avatarColors[(typeof id === 'string' ? id.charCodeAt(0) : id) % avatarColors.length];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Component: Leaderboard                          */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const Leaderboard = () => {
  const { user } = useAuth();

  const [scope, setScope] = useState('global');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Exam scope state
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);

  /* ── Fetch exam list on mount ── */
  useEffect(() => {
    examService.listExams(1, 100).then((res) => {
      const list = res.exams || res.results || res || [];
      setExams(list);
    }).catch(() => {});
  }, []);

  /* ── Fetch leaderboard ── */
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = { scope, limit: 50 };
      if (scope === 'exam' && selectedExam) {
        params.exam_id = selectedExam.id || selectedExam._id;
      }
      const data = await examEngineService.getLeaderboard(params);
      setEntries(Array.isArray(data) ? data : data.leaderboard || data.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [scope, selectedExam]);

  useEffect(() => {
    if (scope === 'exam' && !selectedExam) {
      setEntries([]);
      setLoading(false);
      return;
    }
    fetchLeaderboard();
  }, [fetchLeaderboard, scope, selectedExam]);

  /* ── Derived data ── */
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const top3 = filteredEntries.slice(0, 3);
  const tableEntries = filteredEntries;

  const currentUser = useMemo(
    () =>
      entries.find(
        (e) => e.email === user?.email || e.user_id === user?.id
      ) || null,
    [entries, user]
  );

  /* ─────────────── Render ─────────────── */
  return (
    <AmbientPage
      blobs={[
        { key: 'lb-indigo', className: 'blob-indigo', style: { top: '0%', left: '-8%', opacity: 0.12 } },
        { key: 'lb-purple', className: 'blob-purple', style: { top: '22%', right: '-10%', opacity: 0.1 } },
        { key: 'lb-cyan', className: 'blob-cyan', style: { bottom: '6%', left: '20%', opacity: 0.08 } },
      ]}
    >
      {/* ── Page Header ── */}
      <PageHeader
        eyebrow="Rankings"
        title="Leaderboard"
        description="See where you stand against the best. Climb the ranks by taking more tests, improving accuracy, and earning XP."
      />

      {/* ── Scope Tabs + Search ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setScope(s.key);
                setSearchQuery('');
              }}
              className={`relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                scope === s.key
                  ? 'bg-white/10 text-[var(--text-primary)] shadow-lg shadow-white/5'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {scope === s.key && (
                <motion.div
                  layoutId="scopeIndicator"
                  className="absolute inset-0 rounded-xl bg-white/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {s.icon} {s.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Exam selector (only in exam scope) */}
          {scope === 'exam' && (
            <div className="relative">
              <button
                onClick={() => setExamDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                {selectedExam ? selectedExam.name : 'Select exam…'}
                <FaChevronDown className={`text-xs transition-transform ${examDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {examDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full z-50 mt-2 max-h-60 w-64 overflow-y-auto rounded-2xl border border-white/10 bg-[var(--bg-card)]/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl"
                  >
                    {exams.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">
                        No exams available
                      </div>
                    )}
                    {exams.map((ex) => (
                      <button
                        key={ex.id || ex._id}
                        onClick={() => {
                          setSelectedExam(ex);
                          setExamDropdownOpen(false);
                        }}
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.06] ${
                          selectedExam?.id === ex.id
                            ? 'bg-white/[0.08] font-semibold text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {ex.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players…"
              className="w-48 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <GlassPanel className="rounded-[28px] p-6">
          <TableSkeleton />
        </GlassPanel>
      )}

      {/* ── Empty state ── */}
      {!loading && filteredEntries.length === 0 && (
        <EmptyState
          icon={<FaTrophy />}
          title={scope === 'exam' && !selectedExam ? 'Select an exam' : 'No rankings yet'}
          description={
            scope === 'exam' && !selectedExam
              ? 'Pick an exam from the dropdown above to view its leaderboard.'
              : 'Be the first to take a test and claim the top spot on the leaderboard!'
          }
        />
      )}

      {/* ── Content ── */}
      {!loading && filteredEntries.length > 0 && (
        <>
          {/* ━━ Top 3 Podium ━━ */}
          {top3.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <SectionTitle title="Top Champions" subtitle="The best performers earn their place on the podium" />
              <div className="flex items-end justify-center gap-4 sm:gap-6">
                {PODIUM_CONFIG.map((pod) => {
                  const entry = top3[pod.place - 1];
                  if (!entry) return null;
                  return (
                    <motion.div
                      key={pod.place}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: pod.scale }}
                      transition={{ delay: pod.place === 1 ? 0.2 : pod.place === 2 ? 0.1 : 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className={`${pod.order} flex w-32 flex-col items-center sm:w-40`}
                    >
                      {/* Card */}
                      <div
                        className={`glass-card-static relative flex w-full flex-col items-center overflow-hidden rounded-[24px] pb-5 pt-8 ${pod.height}`}
                      >
                        {/* Gradient overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${pod.gradient} opacity-80`} />

                        {/* Crown / icon */}
                        <div className={`relative mb-3 text-2xl ${pod.iconColor} drop-shadow-lg`}>
                          {pod.icon}
                        </div>

                        {/* Avatar */}
                        <div
                          className={`relative mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(entry.user_id)} ring-2 ${pod.ring} sm:h-16 sm:w-16`}
                        >
                          <span className="text-sm font-bold text-white sm:text-base">
                            {initials(entry.name)}
                          </span>
                        </div>

                        {/* Name & score */}
                        <div className="relative px-2 text-center">
                          <div className="truncate text-sm font-bold text-[var(--text-primary)]">
                            {entry.name}
                          </div>
                          <div className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold text-[var(--text-secondary)]">
                            <FaBolt className="text-amber-400" />
                            {entry.score?.toLocaleString()} pts
                          </div>
                        </div>
                      </div>

                      {/* Rank badge */}
                      <div
                        className={`-mt-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white shadow-lg ${pod.badgeBg}`}
                      >
                        {pod.place}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ━━ Current User Highlight ━━ */}
          {currentUser && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mb-6"
            >
              <GlassPanel className="rounded-[24px] border-indigo-500/20 bg-indigo-500/[0.06] p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Badge */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-indigo-500/20">
                    #{currentUser.rank}
                  </div>
                  {/* Avatar */}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(currentUser.user_id)} text-sm font-bold text-white`}
                  >
                    {initials(currentUser.name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {currentUser.name}{' '}
                      <span className="ml-1 rounded-lg bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                        You
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      Your current standing
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-5 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-[var(--text-primary)]">{currentUser.score?.toLocaleString()}</div>
                      <div className="text-[var(--text-muted)]">Score</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-emerald-400">{currentUser.accuracy ?? '—'}%</div>
                      <div className="text-[var(--text-muted)]">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 font-bold text-amber-300">
                        <FaGem className="text-[10px]" /> {currentUser.xp?.toLocaleString()}
                      </div>
                      <div className="text-[var(--text-muted)]">XP</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 font-bold text-yellow-400">
                        <FaCoins className="text-[10px]" /> {currentUser.coins?.toLocaleString()}
                      </div>
                      <div className="text-[var(--text-muted)]">Coins</div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {/* ━━ Full Rankings Table ━━ */}
          <GlassPanel className="overflow-hidden rounded-[28px]">
            <div className="p-5 sm:p-6">
              <SectionTitle
                title="Full Rankings"
                subtitle={`${filteredEntries.length} player${filteredEntries.length !== 1 ? 's' : ''} ranked`}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    <th className="px-6 py-3.5 text-center">Rank</th>
                    <th className="px-6 py-3.5">Player</th>
                    <th className="px-4 py-3.5 text-right">Score</th>
                    <th className="px-4 py-3.5 text-right">Accuracy</th>
                    <th className="px-4 py-3.5 text-right">Tests</th>
                    <th className="px-4 py-3.5 text-right">XP</th>
                    <th className="px-4 py-3.5 text-right">Coins</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger} initial="hidden" animate="show">
                  {tableEntries.map((entry) => {
                    const isCurrentUser = entry.email === user?.email || entry.user_id === user?.id;
                    const isTop = entry.rank <= 3;
                    return (
                      <motion.tr
                        key={entry.user_id || entry.rank}
                        variants={fadeRow}
                        className={`group border-b border-white/[0.04] transition-colors ${
                          isCurrentUser
                            ? 'bg-indigo-500/[0.07] hover:bg-indigo-500/[0.1]'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-6 py-3.5 text-center">
                          {isTop ? (
                            <div
                              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-white shadow-md ${
                                entry.rank === 1
                                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                                  : entry.rank === 2
                                  ? 'bg-gradient-to-br from-slate-300 to-gray-400'
                                  : 'bg-gradient-to-br from-orange-400 to-amber-600'
                              }`}
                            >
                              {entry.rank}
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-[var(--text-secondary)]">
                              {entry.rank}
                            </span>
                          )}
                        </td>
                        {/* Player */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(entry.user_id)} text-xs font-bold text-white`}
                            >
                              {initials(entry.name)}
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--text-primary)] group-hover:text-white transition">
                                {entry.name}
                                {isCurrentUser && (
                                  <span className="ml-2 rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Score */}
                        <td className="px-4 py-3.5 text-right font-semibold text-[var(--text-primary)]">
                          {entry.score?.toLocaleString()}
                        </td>
                        {/* Accuracy */}
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`font-semibold ${
                              (entry.accuracy ?? 0) >= 80
                                ? 'text-emerald-400'
                                : (entry.accuracy ?? 0) >= 50
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {entry.accuracy != null ? `${entry.accuracy}%` : '—'}
                          </span>
                        </td>
                        {/* Tests */}
                        <td className="px-4 py-3.5 text-right text-[var(--text-secondary)]">
                          {entry.tests_taken ?? '—'}
                        </td>
                        {/* XP */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-300">
                            <FaGem className="text-[10px]" /> {entry.xp?.toLocaleString()}
                          </span>
                        </td>
                        {/* Coins */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                            <FaCoins className="text-[10px]" /> {entry.coins?.toLocaleString()}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          </GlassPanel>
        </>
      )}
    </AmbientPage>
  );
};

export default Leaderboard;
