import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { examService } from '../api/api';
import { CardSkeleton } from '../components/SkeletonLoader';
import { AmbientPage, EmptyState, GlassPanel, MetricCard, PageHeader, SectionTitle } from '../components/enterprise/Ui';
import { FaCalendarAlt, FaListUl, FaRocket, FaSearch, FaSortAlphaDown, FaTrophy } from 'react-icons/fa';

const gradients = [
  { from: '#6366f1', to: '#8b5cf6' },
  { from: '#06b6d4', to: '#0284c7' },
  { from: '#10b981', to: '#059669' },
  { from: '#f59e0b', to: '#d97706' },
  { from: '#f43f5e', to: '#e11d48' },
  { from: '#8b5cf6', to: '#7c3aed' },
  { from: '#14b8a6', to: '#0f766e' },
  { from: '#ec4899', to: '#db2777' },
];

const ExamCard = ({ exam, index, onSubjects, onMock }) => {
  const grad = gradients[exam.id % gradients.length];
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.24) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSubjects(exam.id)}
      className={`overflow-hidden rounded-[28px] border ${hovered ? 'border-indigo-400/30 shadow-[0_16px_48px_rgba(99,102,241,0.18)]' : 'border-white/8'} cursor-pointer bg-white/[0.03] backdrop-blur-xl transition-all`}
    >
      <div className="relative flex h-32 flex-col items-center justify-center overflow-hidden px-5 py-5" style={{ background: `linear-gradient(135deg, ${grad.from}dd, ${grad.to}cc)` }}>
        <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/10" />
        <div className="absolute -left-6 top-0 h-16 w-16 rounded-full bg-white/10" />
        <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-slate-950/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/85">
          {exam.category}
        </div>
        <FaTrophy className="absolute bottom-2 left-4 text-[40px] text-white/15" />
        <h3 className="relative z-10 text-center text-lg font-black leading-6 text-white">{exam.exam_name}</h3>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <span>{exam.category}</span>
          <span className="flex items-center gap-2">
            <FaCalendarAlt /> PYQ Bank
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onSubjects(exam.id);
            }}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] transition hover:border-indigo-400/25 hover:bg-indigo-400/10 hover:text-[var(--text-primary)]"
          >
            Chapters
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onMock(exam.id);
            }}
            className="flex-1 rounded-2xl px-3 py-2 text-[11px] font-bold text-white transition"
            style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`, boxShadow: `0 8px 24px ${grad.from}44` }}
          >
            Mock Test
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Exams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        const [categoryData, examData] = await Promise.all([
          examService.getCategories(),
          examService.listExams(page, limit, searchQuery, sortBy),
        ]);
        setCategories(Array.isArray(categoryData) ? categoryData : []);
        setExams(Array.isArray(examData) ? examData : []);
      } catch (err) {
        console.error('Failed to load exams:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, [page, searchQuery, sortBy]);

  const filteredExams = useMemo(() => {
    if (selectedCategory === 'All') return exams;
    return exams.filter((exam) => exam.category?.toLowerCase() === selectedCategory.toLowerCase());
  }, [exams, selectedCategory]);

  return (
    <AmbientPage
      blobs={[
        { key: 'exams-indigo', className: 'blob-indigo', style: { top: '10%', left: '-8%', opacity: 0.12 } },
        { key: 'exams-cyan', className: 'blob-cyan', style: { bottom: '10%', right: '-8%', opacity: 0.08 } },
      ]}
    >
      <PageHeader
        eyebrow="Exam Bank"
        title="Discover the right exam path for your preparation sprint"
        description="Browse curated collections, filter by category, and jump instantly into chapters or full mock tests."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <MetricCard icon={<FaRocket />} label="Active catalog" value={exams.length.toString()} hint="Exam collections loaded from the live API" accent="from-indigo-500/20 to-cyan-400/5" />
        <MetricCard icon={<FaTrophy />} label="Categories" value={categories.length.toString()} hint="Specialized exam streams and prep domains" accent="from-amber-500/20 to-orange-400/5" iconClassName="text-amber-300" />
      </div>

      <GlassPanel className="mb-6 rounded-[30px] p-4 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex-1">
            <SectionTitle title="Search and filter" subtitle="Use the catalog filters to narrow down the exact exam you want." />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[240px]">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <FaSortAlphaDown />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent text-sm outline-none">
                <option value="alphabetical">A–Z</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="year">By year</option>
              </select>
            </div>
          </div>
        </div>
      </GlassPanel>

      <div className="mb-6 flex flex-wrap gap-2">
        {['All', ...categories.map((category) => category.category)].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${selectedCategory === category ? 'border-indigo-400/30 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white' : 'border-white/10 bg-white/[0.04] text-[var(--text-secondary)] hover:border-indigo-400/20 hover:bg-indigo-400/10'}`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <GlassPanel className="rounded-[30px] p-8">
          <EmptyState icon={<FaListUl />} title="No exams match this filter" description="Try another search phrase or switch to a different category." />
        </GlassPanel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredExams.map((exam, index) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                index={index}
                onSubjects={(id) => navigate(`/subjects?exam_id=${id}`)}
                onMock={(id) => navigate(`/test?exam_id=${id}&test_type=mock`)}
              />
            ))}
          </div>

          {exams.length >= limit ? (
            <div className="mt-8 flex justify-center gap-3">
              <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              <button onClick={() => setPage((current) => current + 1)} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white">
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </AmbientPage>
  );
};

export default Exams;
