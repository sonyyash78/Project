import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowRight,
  FaBrain,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaDownload,
  FaLayerGroup,
  FaPercentage,
  FaShareAlt,
  FaStar,
  FaTrophy,
  FaTimesCircle,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { examEngineService, progressService } from '../api/api';
import { TableSkeleton } from '../components/SkeletonLoader';
import { AmbientPage, EmptyState, GlassPanel, MetricCard, PageHeader, ProgressBar, SectionTitle, TinyTrend } from '../components/enterprise/Ui';
import MarkdownRenderer from '../components/MarkdownRenderer';

const ResultCard = ({ label, value, hint, icon, accent = 'from-indigo-500/20 to-cyan-400/5', iconClass = 'text-indigo-300' }) => (
  <MetricCard icon={icon} label={label} value={value} hint={hint} accent={accent} iconClassName={iconClass} />
);

const TestResult = () => {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [legacyResult, setLegacyResult] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const loadResult = async () => {
      setLoading(true);
      try {
        const enterprise = await examEngineService.getResult(attemptId);
        if (enterprise) {
          setResult(enterprise);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }

      try {
        const fallback = await progressService.getAttemptDetails(attemptId);
        setLegacyResult(fallback);
      } catch (err) {
        console.error(err);
        toast.error('Unable to load the result view.');
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [attemptId, location.search]);

  const normalized = useMemo(() => {
    if (result) {
      const subjectAnalysis = Object.entries(result.subject_analysis || {}).map(([subject, value]) => ({
        subject,
        correct: value.correct || 0,
        wrong: value.wrong || 0,
        skipped: value.skipped || 0,
        total: value.total || 0,
        accuracy: value.total ? ((value.correct || 0) / value.total) * 100 : 0,
      }));
      const difficultyAnalysis = Object.entries(result.difficulty_analysis || {}).map(([difficulty, value]) => ({
        difficulty,
        correct: value.correct || 0,
        wrong: value.wrong || 0,
        skipped: value.skipped || 0,
        total: value.total || 0,
        accuracy: value.total ? ((value.correct || 0) / value.total) * 100 : 0,
      }));
      const chapterMap = {};
      (result.questions || []).forEach((question) => {
        const key = question.chapter_name || 'General';
        if (!chapterMap[key]) chapterMap[key] = { correct: 0, wrong: 0, skipped: 0, total: 0 };
        const bucket = question.selected_answer ? (question.is_correct ? 'correct' : 'wrong') : 'skipped';
        chapterMap[key][bucket] += 1;
        chapterMap[key].total += 1;
      });
      const chapterAnalysis = Object.entries(chapterMap).map(([chapter, value]) => ({
        chapter,
        ...value,
        accuracy: value.total ? (value.correct / value.total) * 100 : 0,
      }));
      const negativeMarks = Math.max(0, (result.questions || []).filter((question) => !question.is_correct && question.selected_answer).length);
      return {
        score: result.score,
        total: result.total_marks,
        accuracy: result.accuracy,
        correct: result.correct,
        wrong: result.wrong,
        skipped: result.skipped,
        speed: result.speed,
        subjectAnalysis,
        difficultyAnalysis,
        chapterAnalysis,
        timeAnalysis: result.time_analysis || [],
        questions: result.questions || [],
        rank: result.rank || Math.max(1, 250 - Math.round(result.accuracy || 0)),
        percentile: result.percentile || Math.min(99.9, 50 + (result.accuracy || 0) / 2),
        negativeMarks,
        attemptPct: result.total_marks ? (((result.correct + result.wrong) / result.questions.length) * 100 || 0) : 0,
      };
    }

    if (legacyResult) {
      const info = legacyResult.attempt_info;
      const questions = (legacyResult.questions || []).map((question) => ({
        question_id: question.question_id,
        question_text: question.question_text,
        selected_answer: question.selected_answer,
        correct_answer: question.correct_answer,
        is_correct: question.is_correct,
        solution: question.solution,
        subject_name: legacyResult.subject_breakdown?.[0]?.subject_name || 'General',
        chapter_name: 'General',
        time_spent_seconds: question.time_spent,
      }));
      return {
        score: info.score,
        total: info.total_marks,
        accuracy: info.accuracy,
        correct: info.correct_count,
        wrong: info.incorrect_count,
        skipped: info.skipped_count,
        speed: info.time_taken ? ((info.correct_count + info.incorrect_count) / info.time_taken) * 60 : 0,
        subjectAnalysis: (legacyResult.subject_breakdown || []).map((item) => ({
          subject: item.subject_name,
          correct: item.correct,
          total: item.total,
          wrong: item.total - item.correct,
          skipped: 0,
          accuracy: item.accuracy,
        })),
        difficultyAnalysis: [],
        chapterAnalysis: [],
        timeAnalysis: questions.map((question) => ({
          question_id: question.question_id,
          time_spent_seconds: question.time_spent_seconds,
          difficulty: 'Mixed',
          chapter_name: 'General',
        })),
        questions,
        rank: Math.max(1, 250 - Math.round(info.accuracy || 0)),
        percentile: Math.min(99.9, 50 + (info.accuracy || 0) / 2),
        negativeMarks: info.incorrect_count,
        attemptPct: questions.length ? (((info.correct_count + info.incorrect_count) / questions.length) * 100 || 0) : 0,
      };
    }

    return null;
  }, [legacyResult, result]);

  const weakTopics = useMemo(
    () => (normalized?.chapterAnalysis || []).filter((item) => item.accuracy < 50).slice(0, 4),
    [normalized]
  );
  const strongTopics = useMemo(
    () => (normalized?.chapterAnalysis || []).filter((item) => item.accuracy >= 70).slice(0, 4),
    [normalized]
  );

  const improvementSuggestions = useMemo(() => {
    if (!normalized) return [];
    const suggestions = [];
    if (normalized.accuracy < 65) suggestions.push('Spend your next practice set on accuracy before chasing speed.');
    if (normalized.wrong > normalized.correct / 2) suggestions.push('Reduce negative marking by flagging doubtful questions for review first.');
    if (weakTopics[0]) suggestions.push(`Revisit ${weakTopics[0].chapter} with a focused medium-difficulty set.`);
    if ((normalized.timeAnalysis || []).some((item) => item.time_spent_seconds > 180)) suggestions.push('Time discipline slipped on a few questions. Use elimination faster and move on sooner.');
    if (!suggestions.length) suggestions.push('You are in good shape. Shift toward timed full mocks and maintain consistency.');
    return suggestions.slice(0, 4);
  }, [normalized, weakTopics]);

  if (loading) {
    return (
      <AmbientPage blobs={[{ key: 'result-indigo', className: 'blob-indigo', style: { top: '4%', left: '-8%', opacity: 0.12 } }]}>
        <TableSkeleton />
      </AmbientPage>
    );
  }

  if (!normalized) {
    return (
      <AmbientPage blobs={[{ key: 'result-indigo', className: 'blob-indigo', style: { top: '4%', left: '-8%', opacity: 0.12 } }]}>
        <EmptyState icon={<FaChartLine />} title="Result unavailable" description="We couldn't build the result screen for this attempt." />
      </AmbientPage>
    );
  }

  const scoreSeries = normalized.timeAnalysis.slice(0, 10).map((item) => item.time_spent_seconds || 0);

  return (
    <AmbientPage
      blobs={[
        { key: 'result-indigo', className: 'blob-indigo', style: { top: '0%', left: '-8%', opacity: 0.12 } },
        { key: 'result-cyan', className: 'blob-cyan', style: { bottom: '8%', right: '-6%', opacity: 0.1 } },
      ]}
    >
      <PageHeader
        eyebrow={`Attempt #${attemptId}`}
        title="Enterprise result analytics with exam-grade breakdowns"
        description="Score, rank estimate, percentile, chapter depth, and timing patterns are all brought together into a decision-making result screen."
        actions={
          <>
            <button
              onClick={() => {
                window.print();
              }}
              className="btn-secondary"
            >
              <FaDownload /> Download PDF
            </button>
            <button
              onClick={async () => {
                const text = `I scored ${Math.round(normalized.score)} out of ${Math.round(normalized.total)} on ExamSIDE with ${Math.round(normalized.accuracy)}% accuracy.`;
                try {
                  await navigator.clipboard.writeText(text);
                  toast.success('Result summary copied to clipboard.');
                } catch {
                  toast.error('Unable to copy result summary.');
                }
              }}
              className="btn-primary"
            >
              Share Result <FaShareAlt className="relative z-10" />
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard icon={<FaTrophy />} label="Total Score" value={`${Math.round(normalized.score)} / ${Math.round(normalized.total)}`} hint="Net score after marking scheme" />
        <ResultCard icon={<FaLayerGroup />} label="Rank" value={`#${Math.round(normalized.rank)}`} hint="Live estimate based on current performance" accent="from-amber-500/20 to-orange-400/5" iconClass="text-amber-300" />
        <ResultCard icon={<FaPercentage />} label="Percentile" value={`${normalized.percentile.toFixed(1)}%`} hint="Relative competitive positioning" accent="from-emerald-500/20 to-cyan-400/5" iconClass="text-emerald-300" />
        <ResultCard icon={<FaChartLine />} label="Accuracy" value={`${Math.round(normalized.accuracy)}%`} hint={`${Math.round(normalized.attemptPct)}% attempt rate`} accent="from-fuchsia-500/20 to-indigo-400/5" iconClass="text-fuchsia-300" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Outcome Summary" subtitle="A compressed operational read of the attempt." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">Correct</div>
                <div className="mt-2 text-3xl font-black text-[var(--text-primary)]">{normalized.correct}</div>
              </div>
              <div className="rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-rose-300">Wrong</div>
                <div className="mt-2 text-3xl font-black text-[var(--text-primary)]">{normalized.wrong}</div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Skipped</div>
                <div className="mt-2 text-3xl font-black text-[var(--text-primary)]">{normalized.skipped}</div>
              </div>
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">Negative marks</div>
                <div className="mt-2 text-3xl font-black text-[var(--text-primary)]">{normalized.negativeMarks}</div>
              </div>
            </div>
          </GlassPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Subject Analysis" subtitle="How your accuracy distributed across subjects." />
              <div className="space-y-4">
                {normalized.subjectAnalysis.length ? (
                  normalized.subjectAnalysis.map((item) => (
                    <ProgressBar
                      key={item.subject}
                      label={item.subject}
                      value={item.accuracy}
                      color="#22d3ee"
                      meta={`${item.correct}/${item.total}`}
                    />
                  ))
                ) : (
                  <EmptyState icon={<FaTrophy />} title="No subject split available" description="This result payload did not include subject-level segmentation." />
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Difficulty Analysis" subtitle="Understand whether easy, medium, or hard questions hurt the score." />
              <div className="space-y-4">
                {normalized.difficultyAnalysis.length ? (
                  normalized.difficultyAnalysis.map((item) => (
                    <ProgressBar
                      key={item.difficulty}
                      label={item.difficulty}
                      value={item.accuracy}
                      color="#f59e0b"
                      meta={`${item.correct}/${item.total}`}
                    />
                  ))
                ) : (
                  <EmptyState icon={<FaStar />} title="Difficulty split unavailable" description="Fallback attempts may not include difficulty segmentation yet." />
                )}
              </div>
            </GlassPanel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Chapter Analysis" subtitle="Find which chapters carried or dragged the attempt." />
              <div className="space-y-4">
                {normalized.chapterAnalysis.length ? (
                  normalized.chapterAnalysis.slice(0, 6).map((item) => (
                    <ProgressBar
                      key={item.chapter}
                      label={item.chapter}
                      value={item.accuracy}
                      color="#818cf8"
                      meta={`${Math.round(item.accuracy)}%`}
                    />
                  ))
                ) : (
                  <EmptyState icon={<FaLayerGroup />} title="Chapter split unavailable" description="Fallback or older attempts may not contain chapter metadata." />
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="rounded-[30px] p-6">
              <SectionTitle title="Time Analysis" subtitle="Question timing pattern across the attempt." />
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Time per question</div>
                  <div className="text-xs text-[var(--text-muted)]">{normalized.timeAnalysis.length} items</div>
                </div>
                <TinyTrend points={scoreSeries} stroke="#34d399" fill="rgba(16,185,129,0.14)" />
              </div>
              <div className="mt-4 space-y-3">
                {normalized.timeAnalysis.slice(0, 4).map((item) => (
                  <div key={item.question_id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    Q{item.question_id} • {item.chapter_name || 'General'} • {item.time_spent_seconds}s
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Detailed Question Review" subtitle="Open any question to inspect answer quality and explanation." />
            <div className="space-y-3">
              {normalized.questions.map((question, index) => {
                const open = expandedId === question.question_id;
                return (
                  <div
                    key={question.question_id}
                    className={`rounded-[24px] border ${
                      question.is_correct ? 'border-emerald-400/20 bg-emerald-400/10' : question.selected_answer ? 'border-rose-400/20 bg-rose-400/10' : 'border-white/8 bg-white/[0.03]'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedId((prev) => (prev === question.question_id ? null : question.question_id))}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Question {index + 1}</div>
                        <div className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
                          <MarkdownRenderer content={question.question_text} />
                        </div>
                      </div>
                      <div className="shrink-0 text-xl">
                        {question.is_correct ? <FaCheckCircle className="text-emerald-300" /> : <FaTimesCircle className="text-rose-300" />}
                      </div>
                    </button>
                    {open ? (
                      <div className="border-t border-white/8 px-5 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--text-secondary)]">
                            <div className="font-semibold text-[var(--text-primary)]">Selected answer</div>
                            <div className="mt-2">
                              {question.selected_answer ? <MarkdownRenderer content={question.selected_answer} /> : 'Skipped'}
                            </div>
                          </div>
                          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--text-secondary)]">
                            <div className="font-semibold text-[var(--text-primary)]">Correct answer</div>
                            <div className="mt-2">
                              <MarkdownRenderer content={question.correct_answer} />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                          <div className="mb-2 font-semibold text-[var(--text-primary)]">Solution / explanation</div>
                          {question.solution ? <MarkdownRenderer content={question.solution} /> : 'No explanation was attached to this question.'}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Strong Topics" subtitle="Topics that are currently helping you win." />
            <div className="space-y-3">
              {strongTopics.length ? (
                strongTopics.map((topic) => (
                  <div key={topic.chapter} className="rounded-[22px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{topic.chapter}</div>
                    <div className="mt-1 text-xs text-emerald-200">{Math.round(topic.accuracy)}% accuracy</div>
                  </div>
                ))
              ) : (
                <EmptyState icon={<FaStar />} title="No strong topic list yet" description="Older result payloads may not expose chapter-level winners." />
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Weak Topics" subtitle="Focus areas for the next revision block." />
            <div className="space-y-3">
              {weakTopics.length ? (
                weakTopics.map((topic) => (
                  <div key={topic.chapter} className="rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{topic.chapter}</div>
                    <div className="mt-1 text-xs text-rose-200">{Math.round(topic.accuracy)}% accuracy</div>
                  </div>
                ))
              ) : (
                <EmptyState icon={<FaCheckCircle />} title="No weak topics surfaced" description="The result view did not detect any chapter under the weak-topic threshold." />
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="Improvement Suggestions" subtitle="Immediate next actions from the attempt pattern." />
            <div className="space-y-3">
              {improvementSuggestions.map((tip) => (
                <div key={tip} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {tip}
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="AI Recommendation Placeholder" subtitle="Reserved card for future AI layer integration." />
            <div className="rounded-[24px] border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/12 via-indigo-500/10 to-cyan-400/10 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-3 text-fuchsia-300">
                  <FaBrain />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">AI score coach</div>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    Once the AI layer is enabled, this card can generate a post-attempt plan using your actual weak topics, timing behavior, and recent score trend.
                  </p>
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="rounded-[30px] p-6">
            <SectionTitle title="What next?" subtitle="Keep the workflow moving while the result is still fresh." />
            <div className="grid gap-3">
              <Link to="/dashboard" className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-indigo-400/30 hover:bg-indigo-400/10">
                Go to dashboard
              </Link>
              <Link to="/subjects" className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-indigo-400/30 hover:bg-indigo-400/10">
                Start another practice set
              </Link>
              <button
                onClick={() => navigate('/exams')}
                className="rounded-[22px] bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-4 text-sm font-bold text-white"
              >
                Jump into another mock
                <FaArrowRight className="ml-2 inline" />
              </button>
            </div>
          </GlassPanel>
        </div>
      </div>
    </AmbientPage>
  );
};

export default TestResult;
