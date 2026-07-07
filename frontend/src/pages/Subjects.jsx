import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { browseService } from '../api/api';
import { CardSkeleton } from '../components/SkeletonLoader';
import {
  AmbientPage,
  EmptyState,
  GlassPanel,
  MetricCard,
  PageHeader,
  SectionTitle,
} from '../components/enterprise/Ui';
import {
  FaArrowRight,
  FaBookOpen,
  FaChevronDown,
  FaChevronUp,
  FaFolderOpen,
  FaGraduationCap,
  FaLayerGroup,
  FaLock,
  FaQuestionCircle,
  FaRocket,
  FaSearch,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const Subjects = () => {
  const navigate = useNavigate();
  const [examMap, setExamMap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadSubjectsData = async () => {
      try {
        const report = await browseService.getReport();
        setExamMap(Array.isArray(report?.exam_map) ? report.exam_map : []);
      } catch (err) {
        console.error('Failed to fetch subjects data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSubjectsData();
  }, []);

  const totals = useMemo(() => {
    const examCount = examMap.length;
    const subjectCount = examMap.reduce((acc, exam) => acc + (exam.subjects?.length || 0), 0);
    const chapterCount = examMap.reduce(
      (acc, exam) => acc + (exam.subjects || []).reduce((sum, subject) => sum + (subject.chapters?.length || 0), 0),
      0
    );
    return { examCount, subjectCount, chapterCount };
  }, [examMap]);

  const handleChapterClick = (chapterId, chapterName, questionCount) => {
    if (questionCount < 1) {
      toast.error('This practice test is locked. Minimum 1 question required.', { icon: '🔒', duration: 4000 });
      return;
    }
    navigate(`/test?mode=practice&chapter_id=${chapterId}&chapter_name=${encodeURIComponent(chapterName)}`);
  };

  const handleExamClick = (examId) => {
    setExpandedExam(expandedExam === examId ? null : examId);
    setExpandedSubject(null);
  };

  const handleSubjectClick = (e, subjectId) => {
    e.stopPropagation();
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId);
  };

  const filteredExamMap = examMap.filter((exam) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      exam.exam_name?.toLowerCase().includes(q) ||
      (exam.subjects || []).some(
        (subject) => subject.name?.toLowerCase().includes(q) || (subject.chapters || []).some((chapter) => chapter.name?.toLowerCase().includes(q))
      )
    );
  });

  return (
    <AmbientPage
      blobs={[
        { key: 'subjects-indigo', className: 'blob-indigo', style: { top: '8%', left: '-8%', opacity: 0.12 } },
        { key: 'subjects-cyan', className: 'blob-cyan', style: { bottom: '10%', right: '-6%', opacity: 0.1 } },
      ]}
    >
      <PageHeader
        eyebrow="Exam Library"
        title="Browse subjects, chapters, and premium practice routes"
        description="Jump into chapter-wise practice, mock-ready collections, and revision flows from a clean, enterprise-grade catalog."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <MetricCard icon={<FaGraduationCap />} label="Exams" value={totals.examCount.toString()} hint="Live exam collections from the backend catalog" accent="from-indigo-500/20 to-cyan-400/5" />
        <MetricCard icon={<FaLayerGroup />} label="Subjects" value={totals.subjectCount.toString()} hint="Topic clusters mapped to every exam" accent="from-fuchsia-500/20 to-indigo-400/5" iconClassName="text-fuchsia-300" />
        <MetricCard icon={<FaRocket />} label="Chapters" value={totals.chapterCount.toString()} hint="Practice-ready chapter routes" accent="from-emerald-500/20 to-cyan-400/5" iconClassName="text-emerald-300" />
      </div>

      <GlassPanel className="mb-8 rounded-[30px] p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <SectionTitle title="Find the right study path" subtitle="Search across exams, subjects, and chapters in real time." />
          </div>
          <div className="relative w-full lg:max-w-md">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search exams, subjects, chapters..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none ring-0 placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </GlassPanel>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <CardSkeleton key={item} />
          ))}
        </div>
      ) : filteredExamMap.length === 0 ? (
        <GlassPanel className="rounded-[30px] p-8">
          <EmptyState icon={<FaGraduationCap />} title="No matching study paths" description="Try another keyword to explore the exam catalog." />
        </GlassPanel>
      ) : (
        <div className="space-y-4">
          {filteredExamMap.map((exam, examIdx) => {
            const isExamExpanded = expandedExam === exam.id;
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: examIdx * 0.03 }}
                className={`overflow-hidden rounded-[28px] border ${isExamExpanded ? 'border-indigo-400/30 bg-indigo-400/10' : 'border-white/8 bg-white/[0.03]'} backdrop-blur-xl`}
              >
                <button
                  onClick={() => handleExamClick(exam.id)}
                  className="flex w-full flex-col gap-3 px-5 py-5 text-left sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${isExamExpanded ? 'border-indigo-400/20 bg-indigo-400/10 text-indigo-300' : 'border-white/10 bg-white/[0.04] text-[var(--text-muted)]'}`}>
                      <FaBookOpen />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">{exam.exam_name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{exam.category}</span>
                        <span>{(exam.subjects || []).length} subjects</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Open syllabus</span>
                    {isExamExpanded ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExamExpanded ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/8">
                      <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-2">
                        {(exam.subjects || []).map((subject) => {
                          const isSubExpanded = expandedSubject === subject.id;
                          return (
                            <div key={subject.id} className="rounded-[24px] border border-white/8 bg-slate-950/30 p-4">
                              <button onClick={(event) => handleSubjectClick(event, subject.id)} className="flex w-full items-center justify-between gap-3 text-left">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-2 text-indigo-300">
                                    <FaFolderOpen />
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-[var(--text-primary)]">{subject.name}</div>
                                    <div className="mt-1 text-xs text-[var(--text-muted)]">{(subject.chapters || []).length} chapters</div>
                                  </div>
                                </div>
                                {isSubExpanded ? <FaChevronUp className="text-[var(--text-muted)]" /> : <FaChevronDown className="text-[var(--text-muted)]" />}
                              </button>

                              <AnimatePresence>
                                {isSubExpanded ? (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="mt-3 space-y-2 border-t border-white/8 pt-3">
                                      {(subject.chapters || []).length === 0 ? (
                                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-[var(--text-muted)]">No chapters available yet.</div>
                                      ) : (
                                        (subject.chapters || []).map((chapter) => {
                                          const isLocked = chapter.question_count < 1;
                                          return (
                                            <button
                                              key={chapter.id}
                                              onClick={() => handleChapterClick(chapter.id, chapter.name, chapter.question_count)}
                                              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition ${isLocked ? 'border-white/8 bg-white/[0.03] opacity-70' : 'border-white/10 bg-white/[0.04] hover:border-indigo-400/20 hover:bg-indigo-400/10'}`}
                                            >
                                              <span className="text-[var(--text-primary)]">{chapter.name}</span>
                                              <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                                {isLocked ? (
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-rose-300">
                                                    <FaLock /> Locked
                                                  </span>
                                                ) : (
                                                  <>
                                                    <FaQuestionCircle /> {chapter.question_count}
                                                  </>
                                                )}
                                              </span>
                                            </button>
                                          );
                                        })
                                      )}
                                    </div>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </AmbientPage>
  );
};

export default Subjects;
