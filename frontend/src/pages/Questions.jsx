import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { questionService } from '../api/api';
import { QuestionSkeleton } from '../components/SkeletonLoader';
import { AmbientPage, EmptyState, GlassPanel, MetricCard, PageHeader } from '../components/enterprise/Ui';
import { FaArrowLeft, FaCheckCircle, FaChevronLeft, FaChevronRight, FaInfoCircle, FaRedo, FaRegLightbulb, FaSearch, FaTrophy, FaTimesCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import MarkdownRenderer from '../components/MarkdownRenderer';

const Questions = () => {
  const [searchParams] = useSearchParams();
  const chapterId = searchParams.get('chapter_id');
  const chapterName = searchParams.get('chapter_name') || 'Chapter Practice';
  const examId = searchParams.get('exam_id');
  const examName = searchParams.get('exam_name') || 'Exam Practice';

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userAnswers, setUserAnswers] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const skip = (page - 1) * limit;

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        let data = [];
        if (chapterId) {
          data = await questionService.listQuestionsByChapter(chapterId, skip, limit);
        } else if (examId) {
          data = await questionService.listQuestionsByExam(examId, skip, limit);
        } else {
          data = await questionService.listQuestionsByExam(1, skip, limit);
        }
        setQuestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load questions:', err);
        toast.error('Failed to retrieve questions.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [chapterId, examId, page, skip]);

  const filteredQuestions = useMemo(() => {
    if (!searchQuery) return questions;
    const query = searchQuery.toLowerCase();
    return questions.filter((question) => question.question?.toLowerCase().includes(query));
  }, [questions, searchQuery]);

  const accuracy = attempted > 0 ? (score / attempted) * 100 : 0;

  const handleOptionClick = async (questionId, optionKey) => {
    if (userAnswers[questionId]) return;

    setSubmittingId(questionId);
    try {
      const response = await questionService.submitAnswer(questionId, optionKey);
      setUserAnswers((prev) => ({
        ...prev,
        [questionId]: {
          selected: optionKey,
          isCorrect: response.is_correct,
          correctAnswer: response.correct_answer,
          solution: response.solution || 'No explanation provided.',
        },
      }));
      setAttempted((prev) => prev + 1);
      if (response.is_correct) {
        setScore((prev) => prev + 1);
        toast.success('Correct answer!', { icon: '🎉' });
      } else {
        toast.error(`Incorrect. Correct answer is ${response.correct_answer}`, { icon: '❌' });
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      toast.error('Failed to check answer.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRevealAnswer = async (questionId) => {
    if (userAnswers[questionId]) return;
    setSubmittingId(questionId);
    try {
      const response = await questionService.submitAnswer(questionId, 'X');
      setUserAnswers((prev) => ({
        ...prev,
        [questionId]: {
          selected: null,
          isCorrect: false,
          correctAnswer: response.correct_answer,
          solution: response.solution || 'No explanation provided.',
        },
      }));
      setAttempted((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to reveal answer:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleResetSession = () => {
    setUserAnswers({});
    setScore(0);
    setAttempted(0);
    setShowScoreModal(false);
    toast.success('Practice session reset.');
  };

  const getSummaryMessage = () => {
    if (accuracy >= 80) return 'Excellent job. You have fully mastered this topic.';
    if (accuracy >= 50) return 'Great effort. Review the detailed solutions and sharpen the weak edges.';
    return 'Keep practicing and revisit the chapter notes before the next round.';
  };

  return (
    <AmbientPage
      blobs={[
        { key: 'questions-indigo', className: 'blob-indigo', style: { top: '8%', left: '-8%', opacity: 0.12 } },
        { key: 'questions-cyan', className: 'blob-cyan', style: { bottom: '10%', right: '-6%', opacity: 0.1 } },
      ]}
    >
      <PageHeader
        eyebrow={chapterId ? chapterName : examName}
        title="Enterprise practice experience for focused revision"
        description="Answer questions, unlock explanations, and maintain a premium study flow without leaving the existing backend flow."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/subjects" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-indigo-400/25 hover:bg-indigo-400/10 hover:text-[var(--text-primary)]">
              <FaArrowLeft className="mr-2 inline" /> Back to subjects
            </Link>
            {attempted > 0 ? (
              <button onClick={() => setShowScoreModal(true)} className="rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">
                View summary
              </button>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard icon={<FaTrophy />} label="Attempted" value={attempted.toString()} hint="Questions you have engaged with" accent="from-indigo-500/20 to-cyan-400/5" />
        <MetricCard icon={<FaCheckCircle />} label="Score" value={score.toString()} hint="Correct responses tracked live" accent="from-emerald-500/20 to-cyan-400/5" iconClassName="text-emerald-300" />
        <MetricCard icon={<FaRegLightbulb />} label="Accuracy" value={`${Math.round(accuracy)}%`} hint="Confidence and mastery meter" accent="from-amber-500/20 to-orange-400/5" iconClassName="text-amber-300" />
      </div>

      <GlassPanel className="mb-6 rounded-[30px] p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Practice control panel</div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Search through the current set and review explanations in a polished flow.</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search in questions..."
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </GlassPanel>

      {loading ? (
        <div className="space-y-4">
          <QuestionSkeleton />
          <QuestionSkeleton />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <GlassPanel className="rounded-[30px] p-8">
          <EmptyState icon={<FaInfoCircle />} title="No questions found" description="This chapter or exam currently has no matching questions for your search." />
        </GlassPanel>
      ) : (
        <div className="space-y-5">
          {filteredQuestions.map((question, index) => {
            const state = userAnswers[question.id];
            const hasAnswered = Boolean(state);
            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_16px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl sm:p-7"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
                  <div className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Q. {skip + index + 1}</div>
                  {question.year ? <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[var(--text-muted)]">{question.exam_session || question.year}</div> : null}
                </div>
                <div className="text-base font-semibold leading-8 text-[var(--text-primary)] sm:text-lg">
                  <MarkdownRenderer content={question.question} />
                </div>
                <div className="mt-6 grid gap-3">
                  {[
                    { key: 'A', text: question.option_a },
                    { key: 'B', text: question.option_b },
                    { key: 'C', text: question.option_c },
                    { key: 'D', text: question.option_d },
                  ].filter((option) => option.text).map((option) => {
                    let optionStyle = 'border-white/8 bg-white/[0.03] text-[var(--text-secondary)]';
                    let icon = null;
                    if (hasAnswered) {
                      const isSelected = state.selected === option.key;
                      const isCorrectAnswer = state.correctAnswer === option.key;
                      if (isCorrectAnswer) {
                        optionStyle = 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
                        icon = <FaCheckCircle className="text-emerald-300" />;
                      } else if (isSelected) {
                        optionStyle = 'border-rose-400/25 bg-rose-400/10 text-rose-200';
                        icon = <FaTimesCircle className="text-rose-300" />;
                      } else {
                        optionStyle = 'border-white/8 bg-slate-950/30 text-[var(--text-muted)] opacity-70';
                      }
                    }
                    return (
                      <button
                        key={option.key}
                        disabled={hasAnswered || submittingId === question.id}
                        onClick={() => handleOptionClick(question.id, option.key)}
                        className={`flex items-center justify-between rounded-[22px] border px-4 py-4 text-left text-sm transition ${optionStyle} ${!hasAnswered ? 'hover:-translate-y-0.5 hover:border-indigo-400/25' : ''}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-2xl border text-sm font-bold ${hasAnswered && state.correctAnswer === option.key ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : hasAnswered && state.selected === option.key ? 'border-rose-400/25 bg-rose-400/10 text-rose-300' : 'border-white/10 bg-slate-950/40 text-[var(--text-muted)]'}`}>
                            {option.key}
                          </span>
                          <div className="min-w-0">
                            <MarkdownRenderer content={option.text} />
                          </div>
                        </span>
                        {icon}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  {!hasAnswered ? (
                    <button onClick={() => handleRevealAnswer(question.id)} disabled={submittingId === question.id} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-indigo-300">
                      <FaRegLightbulb /> Show answer
                    </button>
                  ) : (
                    <span className={`text-sm font-semibold ${state.isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>{state.isCorrect ? 'Correct answer' : 'Review the explanation below'}</span>
                  )}
                </div>

                <AnimatePresence>
                  {hasAnswered ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-5 overflow-hidden">
                      <div className="rounded-[24px] border border-indigo-400/20 bg-indigo-400/10 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Explanation</div>
                        <div className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          <MarkdownRenderer content={state.solution} />
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40">
          <FaChevronLeft className="mr-2 inline" /> Previous
        </button>
        <button onClick={() => setPage((current) => current + 1)} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white">
          Next <FaChevronRight className="ml-2 inline" />
        </button>
      </div>

      <AnimatePresence>
        {showScoreModal ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }} className="w-full max-w-lg rounded-[30px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.6)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
                  <FaTrophy />
                </div>
                <div>
                  <div className="text-lg font-black text-[var(--text-primary)]">Practice session summary</div>
                  <div className="text-sm text-[var(--text-muted)]">A premium quick review of your current run.</div>
                </div>
              </div>
              <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-sm leading-7 text-[var(--text-secondary)]">{getSummaryMessage()}</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 p-3 text-center">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Attempted</div>
                    <div className="mt-2 text-xl font-black text-[var(--text-primary)]">{attempted}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 p-3 text-center">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Score</div>
                    <div className="mt-2 text-xl font-black text-emerald-300">{score}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 p-3 text-center">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Accuracy</div>
                    <div className="mt-2 text-xl font-black text-cyan-300">{attempted ? `${Math.round(accuracy)}%` : '0%'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button onClick={handleResetSession} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">
                  <FaRedo className="mr-2 inline" /> Reset session
                </button>
                <button onClick={() => setShowScoreModal(false)} className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white">
                  Continue practice
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AmbientPage>
  );
};

export default Questions;
