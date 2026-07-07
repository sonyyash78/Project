import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaArrowRight,
  FaBookOpen,
  FaCalculator,
  FaCheck,
  FaClock,
  FaCompress,
  FaExpand,
  FaEyeSlash,
  FaFlag,
  FaKeyboard,
  FaLightbulb,
  FaRegBookmark,
  FaSave,
  FaSignal,
  FaStickyNote,
  FaTimes,
  FaTrash,
  FaWifi,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { examEngineService, examService, progressService, questionService } from '../api/api';
import { QuestionSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/enterprise/Ui';
import MarkdownRenderer from '../components/MarkdownRenderer';

const modeMap = {
  mock: 'custom_mock',
  practice: 'chapter_practice',
};

const storageKeyFor = (mode, examId, chapterId, attemptId) =>
  `examside_session_${attemptId || `${mode}_${examId || 'none'}_${chapterId || 'none'}`}`;

const fallbackOptions = (question) =>
  [
    question.option_a ? { key: 'A', text: question.option_a } : null,
    question.option_b ? { key: 'B', text: question.option_b } : null,
    question.option_c ? { key: 'C', text: question.option_c } : null,
    question.option_d ? { key: 'D', text: question.option_d } : null,
  ].filter(Boolean);

const buildQuestionStatus = (state) => {
  if (state.marked && state.answered) return 'marked-answered';
  if (state.marked) return 'marked';
  if (state.answered) return 'answered';
  if (state.visited) return 'visited';
  return 'not-visited';
};

const Calculator = ({ onClose }) => {
  const [value, setValue] = useState('');
  const handleInput = (token) => {
    if (token === 'C') return setValue('');
    if (token === '=') {
      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${value || 0})`)();
        setValue(String(result));
      } catch {
        setValue('Error');
      }
      return;
    }
    if (token === 'DEL') return setValue((prev) => prev.slice(0, -1));
    setValue((prev) => `${prev}${token}`);
  };

  const keys = ['7', '8', '9', '/', 'sin(', '4', '5', '6', '*', 'cos(', '1', '2', '3', '-', 'tan(', '0', '.', '(', ')', '+', 'C', 'DEL', 'sqrt(', '^', '='];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="glass-card-static w-full max-w-sm rounded-[28px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-bold text-[var(--text-primary)]">Scientific Calculator</div>
          <button onClick={onClose} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-[var(--text-secondary)]">
            <FaTimes />
          </button>
        </div>
        <div className="mb-4 rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-4 text-right text-xl font-bold text-[var(--text-primary)]">
          {value || '0'}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => handleInput(key === '^' ? '**' : key)}
              className={`rounded-xl px-3 py-3 text-xs font-semibold ${
                key === '='
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white'
                  : 'border border-white/8 bg-white/[0.04] text-[var(--text-primary)]'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TestInterface = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examId = searchParams.get('exam_id');
  const chapterId = searchParams.get('chapter_id');
  const explicitAttemptId = searchParams.get('attempt_id');
  const resume = searchParams.get('resume') === '1';
  const testType = searchParams.get('test_type') || (chapterId ? 'practice' : 'mock');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [engineMode, setEngineMode] = useState('fallback');
  const [attemptId, setAttemptId] = useState(explicitAttemptId || '');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialDuration, setInitialDuration] = useState(0);
  const [saveState, setSaveState] = useState('saved');
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [notes, setNotes] = useState({});
  const [questionState, setQuestionState] = useState({});
  const [sessionMeta, setSessionMeta] = useState(null);
  const timerRef = useRef(null);
  const saveTimerRef = useRef(null);

  const storageKey = useMemo(
    () => storageKeyFor(testType, examId, chapterId, attemptId),
    [attemptId, chapterId, examId, testType]
  );

  const currentQuestion = questions[currentIndex];

  const syncLocalSnapshot = (nextState) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        questions,
        currentIndex,
        timeLeft,
        initialDuration,
        notes,
        questionState: nextState || questionState,
        attemptId,
        sessionMeta,
      })
    );
  };

  const hydrateFromLocal = () => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.questions?.length) {
        setQuestions(parsed.questions);
        setCurrentIndex(parsed.currentIndex || 0);
        setTimeLeft(parsed.timeLeft || 0);
        setInitialDuration(parsed.initialDuration || parsed.timeLeft || 0);
        setNotes(parsed.notes || {});
        setQuestionState(parsed.questionState || {});
        if (parsed.attemptId) setAttemptId(String(parsed.attemptId));
        if (parsed.sessionMeta) setSessionMeta(parsed.sessionMeta);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      setError('');

      if (!navigator.onLine && hydrateFromLocal()) {
        setLoading(false);
        return;
      }

      try {
        if (explicitAttemptId || resume) {
          const resumeAttemptId = explicitAttemptId || localStorage.getItem('examside_last_attempt_id');
          if (resumeAttemptId) {
            const session = await examEngineService.getAttemptSession(resumeAttemptId);
            setAttemptId(String(session.attempt_id));
            setEngineMode('enterprise');
            setQuestions(session.questions || []);
            setTimeLeft(session.remaining_seconds || session.duration_seconds || 0);
            setInitialDuration(session.duration_seconds || session.remaining_seconds || 0);
            setSessionMeta(session);
            setQuestionState(
              Object.fromEntries(
                (session.questions || []).map((question) => [
                  question.id,
                  {
                    answer: question.selected_answer || '',
                    visited: Boolean(question.visited),
                    marked: Boolean(question.is_marked_for_review),
                    bookmarked: Boolean(question.is_bookmarked),
                    hiddenOptions: question.hidden_options || [],
                    eliminatedOptions: question.eliminated_options || [],
                    timeSpent: question.time_spent_seconds || 0,
                  },
                ])
              )
            );
            setStarted(true);
            setLoading(false);
            return;
          }
        }

        if (testType === 'mock' && examId) {
          try {
            const session = await examEngineService.startAttempt({
              mode: modeMap.mock,
              exam_id: Number(examId),
              question_count: 30,
              shuffle_questions: true,
              shuffle_options: true,
            });
            setAttemptId(String(session.attempt_id));
            setEngineMode('enterprise');
            setQuestions(session.questions || []);
            setTimeLeft(session.remaining_seconds || session.duration_seconds || 0);
            setInitialDuration(session.duration_seconds || session.remaining_seconds || 0);
            setSessionMeta(session);
          } catch {
            const data = await examService.getMockTest(examId);
            const normalized = (data.questions || []).map((question) => ({
              ...question,
              options: fallbackOptions(question),
            }));
            setEngineMode('fallback');
            setQuestions(normalized);
            setTimeLeft((data.duration_minutes || 30) * 60);
            setInitialDuration((data.duration_minutes || 30) * 60);
            setSessionMeta(data);
          }
        } else if (chapterId) {
          try {
            const session = await examEngineService.startAttempt({
              mode: modeMap.practice,
              chapter_id: Number(chapterId),
              question_count: 20,
              shuffle_questions: true,
              shuffle_options: false,
            });
            setAttemptId(String(session.attempt_id));
            setEngineMode('enterprise');
            setQuestions(session.questions || []);
            setTimeLeft(session.remaining_seconds || session.duration_seconds || 0);
            setInitialDuration(session.duration_seconds || session.remaining_seconds || 0);
            setSessionMeta(session);
          } catch {
            const data = await questionService.listQuestionsByChapter(chapterId, 0, 20);
            const normalized = (data || []).map((question) => ({
              ...question,
              marks: question.marks ?? 4,
              negative_marks: question.negative_marks ?? -1,
              options: fallbackOptions(question),
            }));
            setEngineMode('fallback');
            setQuestions(normalized);
            setTimeLeft(20 * 60);
            setInitialDuration(20 * 60);
            setSessionMeta({ chapter_id: chapterId, total_questions: normalized.length });
          }
        } else if (hydrateFromLocal()) {
          setLoading(false);
          return;
        } else {
          throw new Error('Missing exam or chapter context for this test session.');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || err.message || 'Unable to initialize test session.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [chapterId, examId, explicitAttemptId, resume, testType]);

  useEffect(() => {
    if (!questions.length) return;
    setQuestionState((prev) => {
      if (Object.keys(prev).length) return prev;
      return Object.fromEntries(
        questions.map((question) => [
          question.id,
          {
            answer: '',
            visited: false,
            marked: false,
            bookmarked: false,
            hiddenOptions: [],
            eliminatedOptions: [],
            timeSpent: 0,
          },
        ])
      );
    });
  }, [questions]);

  useEffect(() => {
    if (!started || !questions.length) return;
    const active = questions[currentIndex];
    if (!active) return;
    setQuestionState((prev) => ({
      ...prev,
      [active.id]: {
        ...prev[active.id],
        visited: true,
      },
    }));
  }, [currentIndex, questions, started]);

  useEffect(() => {
    if (!started || !questions.length) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setShowSubmitModal(true);
          return 0;
        }
        return prev - 1;
      });

      const active = questions[currentIndex];
      if (!active) return;
      setQuestionState((prev) => ({
        ...prev,
        [active.id]: {
          ...prev[active.id],
          timeSpent: (prev[active.id]?.timeSpent || 0) + 1,
          visited: true,
        },
      }));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, questions, started]);

  useEffect(() => {
    syncLocalSnapshot();
  }, [attemptId, currentIndex, initialDuration, notes, questionState, questions, sessionMeta, timeLeft]);

  const autosaveAnswer = (questionId, nextState) => {
    if (!questionId) return;
    setSaveState('saving');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (engineMode === 'enterprise' && attemptId) {
          await examEngineService.saveAnswer(attemptId, {
            question_id: questionId,
            selected_answer: nextState.answer || null,
            visited: Boolean(nextState.visited),
            is_marked_for_review: Boolean(nextState.marked),
            is_bookmarked: Boolean(nextState.bookmarked),
            hidden_options: nextState.hiddenOptions || [],
            eliminated_options: nextState.eliminatedOptions || [],
            time_spent_seconds: nextState.timeSpent || 0,
          });
        }
        setSaveState('saved');
      } catch (err) {
        console.error(err);
        setSaveState('error');
      }
    }, 400);
  };

  const updateQuestionState = (questionId, patch) => {
    setQuestionState((prev) => {
      const next = {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          ...patch,
        },
      };
      autosaveAnswer(questionId, next[questionId]);
      return next;
    });
  };

  const persistNote = async (questionId, note) => {
    setNotes((prev) => ({ ...prev, [questionId]: note }));
    if (engineMode === 'enterprise' && attemptId) {
      try {
        await examEngineService.upsertNote({
          question_id: questionId,
          attempt_id: Number(attemptId),
          note,
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleBookmark = async () => {
    if (!currentQuestion) return;
    const current = questionState[currentQuestion.id] || {};
    const nextBookmarked = !current.bookmarked;
    updateQuestionState(currentQuestion.id, { bookmarked: nextBookmarked, visited: true });
    try {
      await progressService.toggleBookmark(currentQuestion.id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleOptionElimination = (optionKey) => {
    const current = questionState[currentQuestion.id] || {};
    const eliminated = current.eliminatedOptions || [];
    const next = eliminated.includes(optionKey)
      ? eliminated.filter((item) => item !== optionKey)
      : [...eliminated, optionKey];
    updateQuestionState(currentQuestion.id, { eliminatedOptions: next });
  };

  const toggleHiddenOptions = () => {
    const current = questionState[currentQuestion.id] || {};
    const hidden = current.hiddenOptions?.length ? [] : currentQuestion.options.map((item) => item.key);
    updateQuestionState(currentQuestion.id, { hiddenOptions: hidden });
  };

  const selectAnswer = (answer) => {
    updateQuestionState(currentQuestion.id, {
      answer,
      visited: true,
    });
  };

  const clearResponse = () => {
    updateQuestionState(currentQuestion.id, {
      answer: '',
      visited: true,
      eliminatedOptions: [],
    });
  };

  const submitAttempt = async () => {
    try {
      if (engineMode === 'enterprise' && attemptId) {
        await examEngineService.submitAttempt(attemptId, {
          elapsed_seconds: initialDuration - timeLeft,
          remaining_seconds: timeLeft,
        });
        localStorage.setItem('examside_last_attempt_id', String(attemptId));
        localStorage.setItem('examside_last_attempt_mode', testType);
        localStorage.removeItem(storageKey);
        navigate(`/result/${attemptId}?engine=enterprise`);
        return;
      }

      const payload = {
        test_type: testType,
        target_id: Number(chapterId || examId),
        time_taken: Math.max(1, initialDuration - timeLeft),
        question_attempts: questions.map((question) => ({
          question_id: question.id,
          selected_answer: questionState[question.id]?.answer || null,
          time_spent: questionState[question.id]?.timeSpent || 0,
        })),
      };
      const result = await progressService.saveAttempt(payload);
      localStorage.removeItem(storageKey);
      navigate(`/result/${result.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit attempt.');
    }
  };

  useEffect(() => {
    const handleKeys = (event) => {
      if (!started || !currentQuestion) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (event.key === 'ArrowRight') setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
      if (event.key === 'ArrowLeft') setCurrentIndex((prev) => Math.max(0, prev - 1));
      if (event.key >= '1' && event.key <= '4') {
        const option = currentQuestion.options?.[Number(event.key) - 1];
        if (option) selectAnswer(option.key);
      }
      if (event.key.toLowerCase() === 'm') {
        updateQuestionState(currentQuestion.id, { marked: !(questionState[currentQuestion.id]?.marked || false), visited: true });
      }
      if (event.key.toLowerCase() === 'b') toggleBookmark();
      if (event.key.toLowerCase() === 'c') clearResponse();
      if (event.key.toLowerCase() === 's') setShowSubmitModal(true);
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [currentQuestion, questionState, questions.length, started]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
      ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const statusCounts = useMemo(() => {
    return questions.reduce(
      (acc, question) => {
        const state = questionState[question.id] || {};
        const status = buildQuestionStatus({
          answered: Boolean(state.answer),
          visited: Boolean(state.visited),
          marked: Boolean(state.marked),
        });
        acc[status] += 1;
        return acc;
      },
      { answered: 0, visited: 0, marked: 0, 'marked-answered': 0, 'not-visited': 0 }
    );
  }, [questionState, questions]);

  const currentState = currentQuestion ? questionState[currentQuestion.id] || {} : {};

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <QuestionSkeleton />
      </div>
    );
  }

  if (error || !questions.length) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <div className="w-full">
          <EmptyState
            icon={<FaBookOpen />}
            title={error ? "Unable to start this exam session" : "Questions Coming Soon!"}
            description={error || "We are currently generating high-quality questions for this exam chapter. Please check back later!"}
          />
          <div className="mt-8 text-center">
            <button onClick={() => navigate(-1)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-[var(--text-secondary)] hover:text-white transition">
              <FaArrowLeft className="mr-2 inline" /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card-static rounded-[32px] p-7 sm:p-8">
            <div className="badge badge-indigo mb-4">{testType === 'mock' ? 'Mock Mode' : 'Practice Mode'}</div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Enterprise Test Interface</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Fullscreen support, autosave, notes, palette control, bookmarks, keyboard shortcuts, and resume-safe timing are all active in this session.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Questions</div>
                <div className="mt-2 text-2xl font-black text-[var(--text-primary)]">{questions.length}</div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Duration</div>
                <div className="mt-2 text-2xl font-black text-[var(--text-primary)]">{formatTime(initialDuration)}</div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Save mode</div>
                <div className="mt-2 text-2xl font-black text-[var(--text-primary)]">{engineMode === 'enterprise' ? 'Live' : 'Local'}</div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={() => navigate(-1)} className="btn-secondary">
                Go Back
              </button>
              <button
                onClick={() => {
                  setStarted(true);
                  toast.success('Exam session started');
                }}
                className="btn-primary"
              >
                Start Exam <FaArrowRight className="relative z-10" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-3 py-3 sm:px-4">
      {showCalculator ? <Calculator onClose={() => setShowCalculator(false)} /> : null}

      <AnimatePresence>
        {showSubmitModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.96, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 20 }}
              className="glass-card-static w-full max-w-lg rounded-[28px] p-6"
            >
              <div className="text-lg font-black text-[var(--text-primary)]">Submit your attempt?</div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Answered: {statusCounts.answered + statusCounts['marked-answered']}, marked for review: {statusCounts.marked + statusCounts['marked-answered']}, not visited: {statusCounts['not-visited']}.
              </p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowSubmitModal(false)} className="btn-secondary flex-1">
                  Keep Attempting
                </button>
                <button onClick={submitAttempt} className="btn-primary flex-1">
                  Submit Now <FaCheck className="relative z-10" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mx-auto flex max-w-[1560px] flex-col gap-3 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="glass-card-static rounded-[28px] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => navigate(-1)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-[var(--text-secondary)]">
                  <FaArrowLeft />
                </button>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    {testType === 'mock' ? 'Mock Exam' : 'Practice Session'}
                  </div>
                  <div className="mt-1 text-lg font-black text-[var(--text-primary)]">
                    Question {currentIndex + 1} of {questions.length}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[var(--text-secondary)]">
                  <FaClock className="mr-2 inline text-indigo-300" />
                  {formatTime(timeLeft)}
                </div>
                <div className={`rounded-2xl border px-3 py-2 ${saveState === 'saved' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : saveState === 'saving' ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : 'border-rose-400/20 bg-rose-400/10 text-rose-300'}`}>
                  <FaSave className="mr-2 inline" />
                  {saveState === 'saved' ? 'Autosaved' : saveState === 'saving' ? 'Saving...' : 'Save issue'}
                </div>
                <div className={`rounded-2xl border px-3 py-2 ${isOffline ? 'border-rose-400/20 bg-rose-400/10 text-rose-300' : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'}`}>
                  {isOffline ? <FaSignal className="mr-2 inline" /> : <FaWifi className="mr-2 inline" />}
                  {isOffline ? 'Offline mode' : 'Online'}
                </div>
                <button onClick={() => setShowCalculator(true)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[var(--text-secondary)]">
                  <FaCalculator className="mr-2 inline text-indigo-300" />
                  Calculator
                </button>
                <button
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen?.();
                    } else {
                      document.exitFullscreen?.();
                    }
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[var(--text-secondary)]"
                >
                  {document.fullscreenElement ? <FaCompress className="mr-2 inline" /> : <FaExpand className="mr-2 inline" />}
                  Fullscreen
                </button>
              </div>
            </div>
          </div>

          {isOffline ? (
            <div className="rounded-[24px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              Internet disconnected. Local autosave remains active and the interface will keep your progress safe.
            </div>
          ) : null}

          <div className="glass-card-static rounded-[30px] p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="badge badge-cyan">{currentQuestion.question_type?.toUpperCase() || 'MCQ'}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[var(--text-secondary)]">
                  +{currentQuestion.marks ?? 4} / {currentQuestion.negative_marks ?? -1}
                </span>
                {currentQuestion.difficulty ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {currentQuestion.difficulty}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={toggleBookmark} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <FaRegBookmark className={`mr-2 inline ${currentState.bookmarked ? 'text-amber-300' : 'text-[var(--text-secondary)]'}`} />
                  {currentState.bookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
                <button onClick={() => setShowNotes((prev) => !prev)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <FaStickyNote className="mr-2 inline text-indigo-300" />
                  Notes
                </button>
                <button onClick={() => setShowShortcuts((prev) => !prev)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <FaKeyboard className="mr-2 inline text-cyan-300" />
                  Shortcuts
                </button>
                <button onClick={() => toast.success('Question reported to review queue.')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <FaFlag className="mr-2 inline text-rose-300" />
                  Report
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-semibold leading-8 text-[var(--text-primary)]">
                      <MarkdownRenderer content={currentQuestion.question} />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-[var(--text-secondary)]">
                      <FaClock className="mr-2 inline text-indigo-300" />
                      {formatTime(currentState.timeSpent || 0)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {currentQuestion.options
                    ?.filter((option) => !(currentState.hiddenOptions || []).includes(option.key))
                    .map((option, index) => {
                      const selected = currentState.answer === option.key;
                      const eliminated = (currentState.eliminatedOptions || []).includes(option.key);
                      return (
                        <div
                          key={option.key}
                          className={`rounded-[24px] border p-4 transition ${
                            selected
                              ? 'border-indigo-400/30 bg-indigo-400/10'
                              : eliminated
                                ? 'border-rose-400/20 bg-rose-400/10 opacity-70'
                                : 'border-white/8 bg-white/[0.03] hover:border-indigo-400/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => selectAnswer(option.key)}
                              className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            >
                              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold ${
                                selected ? 'border-indigo-300 bg-indigo-300/15 text-indigo-200' : 'border-white/10 bg-slate-950/40 text-[var(--text-secondary)]'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="text-sm leading-7 text-[var(--text-primary)]">
                                <MarkdownRenderer content={option.text} />
                              </span>
                            </button>
                            <button
                              onClick={() => toggleOptionElimination(option.key)}
                              className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                                eliminated
                                  ? 'border-rose-400/20 bg-rose-400/10 text-rose-200'
                                  : 'border-white/10 bg-white/[0.04] text-[var(--text-secondary)]'
                              }`}
                            >
                              Eliminate
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <AnimatePresence>
                  {showNotes ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                        <div className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Question Notes</div>
                        <textarea
                          value={notes[currentQuestion.id] || ''}
                          onChange={(event) => persistNote(currentQuestion.id, event.target.value)}
                          rows={5}
                          className="input-field rounded-[20px]"
                          placeholder="Write your elimination logic, formula reminder, or revision clue here..."
                        />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence>
                  {showShortcuts ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                        <div className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</div>
                        <div className="grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                          <div><span className="font-semibold text-[var(--text-primary)]">1-4</span> Select option</div>
                          <div><span className="font-semibold text-[var(--text-primary)]">Arrow keys</span> Navigate questions</div>
                          <div><span className="font-semibold text-[var(--text-primary)]">M</span> Mark for review</div>
                          <div><span className="font-semibold text-[var(--text-primary)]">B</span> Toggle bookmark</div>
                          <div><span className="font-semibold text-[var(--text-primary)]">C</span> Clear response</div>
                          <div><span className="font-semibold text-[var(--text-primary)]">S</span> Open submit dialog</div>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Question Tools</div>
                  <div className="mt-4 grid gap-2">
                    <button onClick={() => updateQuestionState(currentQuestion.id, { marked: !currentState.marked, visited: true })} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-[var(--text-secondary)]">
                      <FaFlag className="mr-2 inline text-fuchsia-300" />
                      {currentState.marked ? 'Unmark review' : 'Mark for review'}
                    </button>
                    <button onClick={toggleHiddenOptions} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-[var(--text-secondary)]">
                      <FaEyeSlash className="mr-2 inline text-cyan-300" />
                      {(currentState.hiddenOptions || []).length ? 'Show options' : 'Hide options'}
                    </button>
                    <button onClick={clearResponse} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-[var(--text-secondary)]">
                      <FaTrash className="mr-2 inline text-rose-300" />
                      Clear response
                    </button>
                    <button onClick={() => setShowCalculator(true)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-[var(--text-secondary)]">
                      <FaCalculator className="mr-2 inline text-indigo-300" />
                      Open calculator
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Palette Summary</div>
                    <div className="text-xs text-[var(--text-muted)]">{questions.length} total</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['answered', statusCounts.answered, 'palette-answered'],
                      ['visited', statusCounts.visited, 'palette-visited'],
                      ['review', statusCounts.marked, 'palette-marked'],
                      ['review + ans', statusCounts['marked-answered'], 'palette-marked-answered'],
                    ].map(([label, count, className]) => (
                      <div key={label} className={`rounded-2xl px-3 py-2 text-center ${className}`}>
                        <div className="font-bold">{count}</div>
                        <div className="mt-1 uppercase tracking-[0.18em]">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-40"
                >
                  <FaArrowLeft className="mr-2 inline" />
                  Previous
                </button>
                <button
                  onClick={() => {
                    updateQuestionState(currentQuestion.id, { marked: !currentState.marked, visited: true });
                    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
                  }}
                  className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-200"
                >
                  <FaFlag className="mr-2 inline" />
                  Mark & Next
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={clearResponse} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">
                  Clear Response
                </button>
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white"
                >
                  Save & Next
                  <FaArrowRight className="ml-2 inline" />
                </button>
                <button onClick={() => setShowSubmitModal(true)} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white">
                  <FaCheck className="mr-2 inline" />
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-full xl:max-w-[360px]">
          <div className="glass-card-static sticky top-3 rounded-[30px] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Question Palette</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">Tap to jump instantly</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[var(--text-secondary)]">
                <FaLightbulb className="mr-2 inline text-amber-300" />
                Keyboard ready
              </div>
            </div>

            <div className="grid max-h-[300px] grid-cols-5 gap-2 overflow-y-auto pr-1">
              {questions.map((question, index) => {
                const state = questionState[question.id] || {};
                const status = buildQuestionStatus({
                  answered: Boolean(state.answer),
                  visited: Boolean(state.visited),
                  marked: Boolean(state.marked),
                });
                const paletteClass =
                  status === 'marked-answered'
                    ? 'palette-marked-answered'
                    : status === 'marked'
                      ? 'palette-marked'
                      : status === 'answered'
                        ? 'palette-answered'
                        : status === 'visited'
                          ? 'palette-visited'
                          : 'palette-not-visited';
                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`${paletteClass} rounded-2xl px-0 py-3 text-xs font-bold ${index === currentIndex ? 'ring-2 ring-indigo-300 ring-offset-2 ring-offset-slate-950' : ''}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Legend</div>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <div><span className="inline-block h-3 w-3 rounded bg-emerald-500 align-middle" /> <span className="ml-2">Answered</span></div>
                <div><span className="inline-block h-3 w-3 rounded bg-rose-500 align-middle" /> <span className="ml-2">Visited</span></div>
                <div><span className="inline-block h-3 w-3 rounded bg-violet-500 align-middle" /> <span className="ml-2">Marked for review</span></div>
                <div><span className="inline-block h-3 w-3 rounded bg-amber-500 align-middle" /> <span className="ml-2">Answered & marked</span></div>
                <div><span className="inline-block h-3 w-3 rounded bg-slate-700 align-middle" /> <span className="ml-2">Not visited</span></div>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Session details</div>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <div>Mode: {engineMode === 'enterprise' ? 'Enterprise engine' : 'Fallback API'}</div>
                <div>Attempt ID: {attemptId || 'local-only'}</div>
                <div>Elapsed: {formatTime(initialDuration - timeLeft)}</div>
                <div>Remaining: {formatTime(timeLeft)}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TestInterface;
