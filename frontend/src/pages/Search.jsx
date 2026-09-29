import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { examService, browseService } from '../api/api';
import { FaSearch, FaTrophy, FaFolderOpen, FaRegQuestionCircle, FaArrowRight, FaFilter } from 'react-icons/fa';
import { CardSkeleton } from '../components/SkeletonLoader';
import { motion } from 'framer-motion';

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [examMap, setExamMap] = useState([]);
  
  // Search results
  const [matchedExams, setMatchedExams] = useState([]);
  const [matchedSubjects, setMatchedSubjects] = useState([]);
  const [matchedChapters, setMatchedChapters] = useState([]);

  useEffect(() => {
    // Pre-load exam-subject-chapter map for filtering
    const loadMap = async () => {
      try {
        const map = await browseService.getExamMap();
        setExamMap(map);
      } catch (err) {
        console.error('Failed to pre-load exam map:', err);
      }
    };
    loadMap();
  }, []);

  const handleSearch = async (val) => {
    setQuery(val);
    if (!val.trim()) {
      setMatchedExams([]);
      setMatchedSubjects([]);
      setMatchedChapters([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch matching exams from backend api
      const examsData = await examService.listExams(1, 10, val);
      setMatchedExams(examsData);

      // 2. Perform search matches locally on loaded examMap for subjects and chapters
      const matchedSubs = [];
      const matchedChaps = [];

      examMap.forEach(exam => {
        exam.subjects.forEach(subject => {
          // Check subject name
          if (subject.name.toLowerCase().includes(val.toLowerCase())) {
            matchedSubs.push({
              ...subject,
              exam_name: exam.exam_name,
              exam_id: exam.id
            });
          }

          subject.chapters.forEach(chapter => {
            // Check chapter name
            if (chapter.name.toLowerCase().includes(val.toLowerCase())) {
              matchedChaps.push({
                ...chapter,
                subject_name: subject.name,
                subject_id: subject.id,
                exam_name: exam.exam_name,
                exam_id: exam.id
              });
            }
          });
        });
      });

      setMatchedSubjects(matchedSubs.slice(0, 8)); // Limit to top 8
      setMatchedChapters(matchedChaps.slice(0, 8)); // Limit to top 8

    } catch (err) {
      console.error('Failed to run search queries:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = matchedExams.length > 0 || matchedSubjects.length > 0 || matchedChapters.length > 0;

  return (
    <div className="relative min-h-screen py-12 px-4 md:px-8">
      {/* Background blobs */}
      <div className="bg-blob blob-indigo top-10 left-10"></div>
      <div className="bg-blob blob-cyan bottom-10 right-10"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Global <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent text-glow">Search</span>
          </h1>
          <p className="text-slate-400">
            Search our databases instantly to find relevant exams, subjects, or chapter practice sets.
          </p>
        </div>

        {/* Search Input Card */}
        <div className="glass rounded-2xl p-6 border border-slate-800/80 mb-8 shadow-xl">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 text-lg">
              <FaSearch />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type to search exams, subjects, or chapters..."
              className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500/85 rounded-xl text-slate-200 placeholder-slate-550 text-sm transition-all shadow-inner font-medium"
              autoFocus
            />
          </div>
        </div>

        {/* Results Sections */}
        {loading ? (
          <div className="space-y-6">
            <CardSkeleton />
          </div>
        ) : (
          <>
            {query.trim() && !hasResults ? (
              <div className="glass rounded-2xl p-12 text-center border border-slate-800/80">
                <p className="text-slate-400 text-sm">
                  No matching results found for "<span className="text-indigo-300 font-bold">{query}</span>".
                </p>
              </div>
            ) : null}

            {/* Results Display */}
            {hasResults && (
              <div className="space-y-8">
                
                {/* 1. Matches Exams */}
                {matchedExams.length > 0 && (
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FaTrophy className="text-amber-500" /> Matching Exams ({matchedExams.length})
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {matchedExams.map((exam) => (
                        <Link
                          key={exam.id}
                          to={`/subjects?exam_id=${exam.id}`}
                          className="glass rounded-xl p-4.5 border border-slate-850 hover:border-slate-750 flex items-center justify-between group transition-all duration-300"
                        >
                          <div>
                            <h4 className="font-bold text-slate-250 group-hover:text-indigo-400 transition-colors">
                              {exam.exam_name}
                            </h4>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                              {exam.category}
                            </p>
                          </div>
                          <FaArrowRight className="text-slate-650 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all text-xs" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Matches Subjects */}
                {matchedSubjects.length > 0 && (
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FaFolderOpen className="text-indigo-400" /> Matching Subjects ({matchedSubjects.length})
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {matchedSubjects.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/subjects?exam_id=${sub.exam_id}`}
                          className="glass rounded-xl p-4.5 border border-slate-850 hover:border-slate-750 flex items-center justify-between group transition-all duration-300"
                        >
                          <div>
                            <h4 className="font-bold text-slate-250 group-hover:text-indigo-400 transition-colors">
                              {sub.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              Exam: {sub.exam_name}
                            </p>
                          </div>
                          <FaArrowRight className="text-slate-650 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all text-xs" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Matches Chapters */}
                {matchedChapters.length > 0 && (
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FaRegQuestionCircle className="text-purple-400" /> Matching Chapters ({matchedChapters.length})
                    </h3>
                    
                    <div className="space-y-3">
                      {matchedChapters.map((chap) => (
                        <Link
                          key={chap.id}
                          to={`/questions?chapter_id=${chap.id}&chapter_name=${encodeURIComponent(chap.name)}`}
                          className="glass rounded-xl p-4.5 border border-slate-850 hover:border-slate-750 flex items-center justify-between group transition-all duration-300"
                        >
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-250 group-hover:text-indigo-400 transition-colors">
                              {chap.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-2.5 text-[10px] font-semibold text-slate-500 uppercase">
                              <span>Subject: {chap.subject_name}</span>
                              <span className="hidden sm:inline">&bull;</span>
                              <span>Exam: {chap.exam_name}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-550 border border-slate-850 px-2 py-0.5 rounded-md">
                              {chap.question_count} MCQs
                            </span>
                            <FaArrowRight className="text-slate-650 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all text-xs" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default Search;
