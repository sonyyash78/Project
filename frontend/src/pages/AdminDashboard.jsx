import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { examService, subjectService, chapterService, questionService, browseService, adminService, aiService } from '../api/api';
import { TableSkeleton } from '../components/SkeletonLoader';
import SmartCombobox from '../components/SmartCombobox';
import { FaTrophy, FaBook, FaFolderOpen, FaTasks, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaDatabase, FaCog, FaUpload, FaFileCsv, FaRobot, FaMagic, FaCode } from 'react-icons/fa';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Navigation guard
  useEffect(() => {
    if (!user || !isAdmin()) {
      toast.error('Admin access required.');
      navigate('/login');
    }
  }, [user]);

  // Tab State: 'overview', 'exams', 'subjects', 'chapters', 'questions', 'bulk_upload'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ exam_count: 0, subject_count: 0, chapter_count: 0, question_count: 0 });

  // Data States
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Sub-filtering states for listing questions / chapters
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // Bulk Upload File State
  const [bulkFile, setBulkFile] = useState(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');

  const [aiForm, setAiForm] = useState({
    exam: '',
    examId: null,
    subject: '',
    subjectId: null,
    chapter: '',
    chapterId: null,
    topic: '',
    topicId: null,
    question_count: 5,
    difficulty_distribution: { Easy: 2, Medium: 2, Hard: 1 },
    question_type: 'mcq',
    language: 'English',
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiStats, setAiStats] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);
  const [aiActiveSubTab, setAiActiveSubTab] = useState('generator'); // generator | history

  // Combobox Data States
  const [aiExams, setAiExams] = useState([]);
  const [aiSubjects, setAiSubjects] = useState([]);
  const [aiChapters, setAiChapters] = useState([]);
  const [aiTopics, setAiTopics] = useState([]);

  const [loadingAiExams, setLoadingAiExams] = useState(false);
  const [loadingAiSubjects, setLoadingAiSubjects] = useState(false);
  const [loadingAiChapters, setLoadingAiChapters] = useState(false);
  const [loadingAiTopics, setLoadingAiTopics] = useState(false);

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'exam', 'subject', 'chapter', 'question'
  const [editItem, setEditItem] = useState(null); // Item currently being edited
  
  // Confirmation Dialog State
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Form Fields State
  const [examForm, setExamForm] = useState({ exam_name: '', category: 'Engineering', image: '', positive_marks: 4.0, negative_marks: -1.0 });
  const [subjectForm, setSubjectForm] = useState({ name: '', exam_id: '' });
  const [chapterForm, setChapterForm] = useState({ name: '', subject_id: '' });
  const [questionForm, setQuestionForm] = useState({
    exam_id: '',
    chapter_id: '',
    question: '',
    question_type: 'mcq',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    solution: '',
    year: new Date().getFullYear(),
    exam_session: '',
    difficulty: 'Medium',
    marks: 4.0,
    negative_marks: -1.0,
    time: 60,
    topic: ''
  });

  // Fetch Dashboard Stats
  const loadStats = async () => {
    try {
      const data = await browseService.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Cascading Lookups for AI Generator
  useEffect(() => {
    if (aiForm.examId) {
       setLoadingAiSubjects(true);
       examService.listSubjectsByExam(aiForm.examId).then(setAiSubjects).finally(() => setLoadingAiSubjects(false));
    } else {
       setAiSubjects([]);
    }
  }, [aiForm.examId]);

  useEffect(() => {
    if (aiForm.subjectId) {
       setLoadingAiChapters(true);
       chapterService.listChaptersBySubject(aiForm.subjectId).then(setAiChapters).finally(() => setLoadingAiChapters(false));
    } else {
       setAiChapters([]);
    }
  }, [aiForm.subjectId]);

  useEffect(() => {
    if (aiForm.chapterId) {
       setLoadingAiTopics(true);
       import('../api/api').then(({ topicService }) => {
         topicService.listTopicsByChapter(aiForm.chapterId).then(setAiTopics).finally(() => setLoadingAiTopics(false));
       });
    } else {
       setAiTopics([]);
    }
  }, [aiForm.chapterId]);

  // Handle Tab Switch & Fetch corresponding tab list
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'bulk_upload') {
      loadStats();
      return;
    }

    if (activeTab === 'revenue') {
      setLoading(true);
      adminService.getRevenueDashboard()
        .then(setRevenueData)
        .catch(() => toast.error('Failed to load revenue data.'))
        .finally(() => setLoading(false));
      return;
    }

    if (activeTab === 'users') {
      setLoading(true);
      adminService.getUsers(1, 100, usersSearchQuery)
        .then(data => setUsersList(data.users || []))
        .catch(() => toast.error('Failed to load users list.'))
        .finally(() => setLoading(false));
      return;
    }

    if (activeTab === 'payments') {
      setLoading(true);
      adminService.getPayments(1, 100)
        .then(data => setPaymentsList(data.payments || []))
        .catch(() => toast.error('Failed to load payments list.'))
        .finally(() => setLoading(false));
      return;
    }

    if (activeTab === 'ai_generator') {
      aiService.getStats().then(data => setAiStats(data.stats)).catch(() => {});
      aiService.getHistory().then(data => setAiHistory(data.history || [])).catch(() => {});
      
      setLoadingAiExams(true);
      examService.listExams(1, 100).then(data => setAiExams(data)).catch(() => {}).finally(() => setLoadingAiExams(false));
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'exams') {
          const list = await examService.listExams(1, 100);
          setExams(list);
        } else if (activeTab === 'subjects') {
          const list = await subjectService.listSubjects(1, 100);
          const exList = await examService.listExams(1, 100);
          setExams(exList);
          setSubjects(list);
        } else if (activeTab === 'chapters') {
          const exList = await examService.listExams(1, 100);
          setExams(exList);
          
          if (selectedSubjectId) {
            const list = await chapterService.listChaptersBySubject(selectedSubjectId);
            setChapters(list);
          } else {
            setChapters([]);
          }
        } else if (activeTab === 'questions') {
          const exList = await examService.listExams(1, 100);
          setExams(exList);
          
          const qParams = { skip: 0, limit: 100 };
          if (selectedExamId) qParams.exam_id = Number(selectedExamId);
          if (selectedSubjectId) qParams.subject_id = Number(selectedSubjectId);
          if (selectedChapterId) qParams.chapter_id = Number(selectedChapterId);
          
          const resp = await questionService.listAllQuestionsAdmin(qParams);
          setQuestions(resp.questions || []);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, selectedExamId, selectedSubjectId, selectedChapterId, usersSearchQuery]);

  // Cascading helpers
  const handleExamChangeForChapters = async (examId) => {
    setSelectedExamId(examId);
    setSelectedSubjectId('');
    setChapters([]);
    if (examId) {
      try {
        const subs = await examService.listSubjectsByExam(examId);
        setSubjects(subs);
      } catch (err) {
        toast.error('Failed to load subjects.');
      }
    } else {
      setSubjects([]);
    }
  };

  const handleExamChangeForQuestions = async (examId) => {
    setSelectedExamId(examId);
    setSelectedSubjectId('');
    setSelectedChapterId('');
    setQuestions([]);
    if (examId) {
      try {
        const subs = await examService.listSubjectsByExam(examId);
        setSubjects(subs);
      } catch (err) {
        toast.error('Failed to load subjects.');
      }
    } else {
      setSubjects([]);
    }
  };

  const handleSubjectChangeForQuestions = async (subId) => {
    setSelectedSubjectId(subId);
    setSelectedChapterId('');
    setQuestions([]);
    if (subId) {
      try {
        const chaps = await chapterService.listChaptersBySubject(subId);
        setChapters(chaps);
      } catch (err) {
        toast.error('Failed to load chapters.');
      }
    } else {
      setChapters([]);
    }
  };

  // --- CRUD Forms ---

  const handleSaveExam = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await examService.updateExam(editItem.id, examForm);
        toast.success('Exam details updated!');
      } else {
        await examService.createExam(examForm);
        toast.success('New exam configured!');
      }
      setShowModal(false);
      const list = await examService.listExams(1, 100);
      setExams(list);
      loadStats();
    } catch (err) {
      toast.error('Operation failed.');
    }
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await subjectService.updateSubject(editItem.id, { name: subjectForm.name });
        toast.success('Subject details updated!');
      } else {
        await subjectService.createSubject(subjectForm);
        toast.success('New subject added!');
      }
      setShowModal(false);
      const list = await subjectService.listSubjects(1, 100);
      setSubjects(list);
      loadStats();
    } catch (err) {
      toast.error('Operation failed.');
    }
  };

  const handleSaveChapter = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await chapterService.updateChapter(editItem.id, { name: chapterForm.name });
        toast.success('Chapter details updated!');
      } else {
        await chapterService.createChapter(chapterForm);
        toast.success('New chapter configured!');
      }
      setShowModal(false);
      if (selectedSubjectId) {
        const list = await chapterService.listChaptersBySubject(selectedSubjectId);
        setChapters(list);
      }
      loadStats();
    } catch (err) {
      toast.error('Operation failed.');
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await questionService.updateQuestion(editItem.id, questionForm);
        toast.success('Question updated successfully!');
      } else {
        await questionService.createQuestion(questionForm);
        toast.success('Question added successfully!');
      }
      setShowModal(false);
      if (selectedChapterId) {
        const list = await questionService.listQuestionsByChapter(selectedChapterId, 0, 100);
        setQuestions(list);
      }
      loadStats();
    } catch (err) {
      toast.error('Operation failed.');
    }
  };

  // Generic edits
  const triggerEdit = (type, item) => {
    setEditItem(item);
    setModalType(type);
    
    if (type === 'exam') {
      setExamForm({
        exam_name: item.exam_name,
        category: item.category,
        image: item.image,
        positive_marks: item.positive_marks ?? 4.0,
        negative_marks: item.negative_marks ?? -1.0
      });
    } else if (type === 'subject') {
      setSubjectForm({ name: item.name, exam_id: item.exam_id });
    } else if (type === 'chapter') {
      setChapterForm({ name: item.name, subject_id: item.subject_id });
    } else if (type === 'question') {
      setQuestionForm({
        exam_id: item.exam_id,
        chapter_id: item.chapter_id || '',
        question: item.question,
        question_type: item.question_type || 'mcq',
        option_a: item.option_a || '',
        option_b: item.option_b || '',
        option_c: item.option_c || '',
        option_d: item.option_d || '',
        correct_answer: item.correct_answer,
        solution: item.solution || '',
        year: item.year || new Date().getFullYear(),
        exam_session: item.exam_session || '',
        difficulty: item.difficulty || 'Medium',
        marks: item.marks ?? 4.0,
        negative_marks: item.negative_marks ?? -1.0,
        time: item.time ?? 60,
        topic: item.topic || ''
      });
    }
    setShowModal(true);
  };

  const triggerCreate = (type) => {
    setEditItem(null);
    setModalType(type);
    
    if (type === 'exam') {
      setExamForm({ exam_name: '', category: 'Engineering', image: '', positive_marks: 4.0, negative_marks: -1.0 });
    } else if (type === 'subject') {
      setSubjectForm({ name: '', exam_id: selectedExamId || (exams[0]?.id || '') });
    } else if (type === 'chapter') {
      setChapterForm({ name: '', subject_id: selectedSubjectId || '' });
    } else if (type === 'question') {
      setQuestionForm({
        exam_id: selectedExamId || '',
        chapter_id: selectedChapterId || '',
        question: '',
        question_type: 'mcq',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        solution: '',
        year: new Date().getFullYear(),
        exam_session: '',
        difficulty: 'Medium',
        marks: 4.0,
        negative_marks: -1.0,
        time: 60,
        topic: ''
      });
    }
    setShowModal(true);
  };

  const triggerDelete = (type, id) => {
    const action = async () => {
      try {
        if (type === 'exam') {
          await examService.deleteExam(id);
          const list = await examService.listExams(1, 100);
          setExams(list);
        } else if (type === 'subject') {
          await subjectService.deleteSubject(id);
          const list = await subjectService.listSubjects(1, 100);
          setSubjects(list);
        } else if (type === 'chapter') {
          await chapterService.deleteChapter(id);
          if (selectedSubjectId) {
            const list = await chapterService.listChaptersBySubject(selectedSubjectId);
            setChapters(list);
          }
        } else if (type === 'question') {
          await questionService.deleteQuestion(id);
          if (selectedChapterId) {
            const list = await questionService.listQuestionsByChapter(selectedChapterId, 0, 100);
            setQuestions(list);
          }
        }
        toast.success(`Deleted successfully!`);
        loadStats();
      } catch (err) {
        toast.error('Deletion failed.');
      }
    };

    setConfirmAction(() => action);
    setShowConfirm(true);
  };

  // --- Bulk CSV / JSON Upload Handler ---
  const handleFileChange = async (file) => {
    setBulkFile(file);
    setBulkPreview(null);
    setUploadStatus(null);
    if (!file) return;

    setPreviewLoading(true);
    const toastId = toast.loading('Validating file structure...');
    try {
      const data = await questionService.bulkUploadPreview(file);
      setBulkPreview(data);
      if (data.error_count > 0) {
        toast.error(`Validation found ${data.error_count} row errors. Review the report below.`, { id: toastId, duration: 6000 });
      } else {
        toast.success(`Validation passed: ${data.valid_count} questions ready.`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Validation failed. Check file structure.', { id: toastId });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      toast.error('Please select a CSV or JSON file first.');
      return;
    }

    setUploadingBulk(true);
    const toastId = toast.loading('Uploading and importing questions into database...');
    try {
      const response = await questionService.bulkUpload(bulkFile);
      setUploadStatus(response);
      toast.success(`Success! Successfully imported ${response.inserted_questions} questions.`, { id: toastId, duration: 5000 });
      setBulkFile(null);
      setBulkPreview(null);
      loadStats();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Upload and execution failed. Changes rolled back.', { id: toastId });
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleAiGenerate = async (e) => {
    e.preventDefault();
    if (!aiForm.exam || !aiForm.subject || !aiForm.chapter) {
      toast.error('Please specify Exam, Subject, and Chapter.');
      return;
    }
    setAiGenerating(true);
    const toastId = toast.loading('AI is generating questions...');
    try {
      const response = await aiService.generate(aiForm);
      setAiQuestions(response);
      toast.success(`Successfully generated ${response.length} questions!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'AI generation failed.', { id: toastId });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiEdit = (index, field, value) => {
    const updated = [...aiQuestions];
    updated[index][field] = value;
    setAiQuestions(updated);
  };

  const handleAiDelete = (index) => {
    setAiQuestions(aiQuestions.filter((_, i) => i !== index));
  };

  const handleAiSave = async () => {
    if (aiQuestions.length === 0) return;
    const toastId = toast.loading('Saving questions to database...');
    try {
      const payload = {
        exam: aiForm.exam,
        subject: aiForm.subject,
        chapter: aiForm.chapter,
        topic: aiForm.topic,
        language: aiForm.language,
        generation_time: 2.5, // approximate mock metric or grab from timing
        duplicates_removed: 0,
        questions: aiQuestions
      };
      const response = await aiService.save(payload);
      toast.success(`Success! Saved ${response.data.inserted} questions (Skipped ${response.data.duplicates_skipped} duplicates)`, { id: toastId, duration: 5000 });
      setAiQuestions([]);
      // Refresh stats/history
      aiService.getStats().then(data => setAiStats(data.stats)).catch(() => {});
      aiService.getHistory().then(data => setAiHistory(data.history || [])).catch(() => {});
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to save to database.', { id: toastId });
    }
  };

  const handleDeleteAiHistory = async (logId) => {
    if (!window.confirm("Delete this history log?")) return;
    try {
      await aiService.deleteHistory(logId);
      toast.success("Log deleted.");
      aiService.getStats().then(data => setAiStats(data.stats)).catch(() => {});
      aiService.getHistory().then(data => setAiHistory(data.history || [])).catch(() => {});
    } catch (err) {
      toast.error("Failed to delete log.");
    }
  };

  if (!user || !isAdmin()) return null;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', padding: '32px 24px' }}>
      {/* Background blobs */}
      <div className="bg-blob blob-indigo" style={{ top: '5%', left: '-5%', opacity: 0.1 }}></div>

      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Title */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingBottom: 24, borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, letterSpacing: '-0.02em' }}>
              <FaCog style={{ color: '#6366f1' }} /> Admin Console
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Logged in as <span style={{ color: '#818cf8', fontWeight: 700 }}>{user.name}</span>
            </p>
          </div>
          
          {/* Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'exams', name: 'Exams' },
              { id: 'subjects', name: 'Subjects' },
              { id: 'chapters', name: 'Chapters' },
              { id: 'questions', name: 'Questions' },
              { id: 'bulk_upload', name: 'CSV Upload' },
              { id: 'ai_generator', name: 'AI Generator' },
              { id: 'revenue', name: 'Revenue' },
              { id: 'users', name: 'Users' },
              { id: 'payments', name: 'Payments' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  border: activeTab === tab.id ? 'none' : '1px solid var(--border-subtle)',
                  boxShadow: activeTab === tab.id ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {[
                { name: 'Exams', val: stats.exam_count, color: '#6366f1', icon: <FaTrophy /> },
                { name: 'Subjects', val: stats.subject_count, color: '#10b981', icon: <FaBook /> },
                { name: 'Chapters', val: stats.chapter_count, color: '#06b6d4', icon: <FaFolderOpen /> },
                { name: 'Questions', val: stats.question_count, color: '#8b5cf6', icon: <FaTasks /> },
              ].map(stat => (
                <div key={stat.name} style={{
                  background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
                  border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 22,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.name}</span>
                    <span style={{ fontSize: 18, color: stat.color }}>{stat.icon}</span>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{stat.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg-glass)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Database Control</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 600 }}>
                Add and configure your mock tests. Each exam features custom markings which can be configured inside the Exam settings. Use the CSV bulk tab to import large sets of questions.
              </p>
            </div>
          </div>
        )}

        {/* --- EXAMS TAB --- */}
        {activeTab === 'exams' && (
          <div className="glass rounded-2xl border border-slate-800/80 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Exams Directory</h3>
              <button
                onClick={() => triggerCreate('exam')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                <FaPlus /> Create Exam
              </button>
            </div>

            {loading ? <TableSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase text-slate-450 bg-slate-950/60 border-b border-slate-850">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Exam Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Marking Pattern</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {exams.map(ex => (
                      <tr key={ex.id} className="hover:bg-slate-900/30">
                        <td className="px-6 py-4 font-mono text-xs">{ex.id}</td>
                        <td className="px-6 py-4 font-semibold text-white">{ex.exam_name}</td>
                        <td className="px-6 py-4">{ex.category}</td>
                        <td className="px-6 py-4 text-xs font-mono text-indigo-400 font-bold">
                          +{ex.positive_marks ?? 4} / {ex.negative_marks ?? -1}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => triggerEdit('exam', ex)} className="p-2 rounded bg-slate-800 hover:bg-indigo-600/20 text-indigo-400 cursor-pointer"><FaEdit /></button>
                          <button onClick={() => triggerDelete('exam', ex.id)} className="p-2 rounded bg-slate-800 hover:bg-rose-600/20 text-rose-400 cursor-pointer"><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- SUBJECTS TAB --- */}
        {activeTab === 'subjects' && (
          <div className="glass rounded-2xl border border-slate-800/80 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Subjects Directory</h3>
              <button
                onClick={() => triggerCreate('subject')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                <FaPlus /> Create Subject
              </button>
            </div>

            {loading ? <TableSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase text-slate-450 bg-slate-950/60 border-b border-slate-850">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Subject Name</th>
                      <th className="px-6 py-4">Exam Name (ID)</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {subjects.map(sub => {
                      const exam = exams.find(e => e.id === sub.exam_id);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-900/30">
                          <td className="px-6 py-4 font-mono text-xs">{sub.id}</td>
                          <td className="px-6 py-4 font-semibold text-white">{sub.name}</td>
                          <td className="px-6 py-4">{exam ? exam.exam_name : 'unknown'} ({sub.exam_id})</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => triggerEdit('subject', sub)} className="p-2 rounded bg-slate-800 hover:bg-indigo-600/20 text-indigo-400 cursor-pointer"><FaEdit /></button>
                            <button onClick={() => triggerDelete('subject', sub.id)} className="p-2 rounded bg-slate-800 hover:bg-rose-600/20 text-rose-400 cursor-pointer"><FaTrash /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- CHAPTERS TAB --- */}
        {activeTab === 'chapters' && (
          <div className="glass rounded-2xl border border-slate-800/80 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h3 className="font-bold text-lg text-white">Topics/Chapters</h3>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedExamId}
                  onChange={(e) => handleExamChangeForChapters(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-350 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs cursor-pointer"
                >
                  <option value="">Select Exam...</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name}</option>)}
                </select>

                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={!selectedExamId}
                  className="bg-slate-950 border border-slate-800 text-slate-350 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs disabled:opacity-40 cursor-pointer"
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <button
                  disabled={!selectedSubjectId}
                  onClick={() => triggerCreate('chapter')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-xs font-semibold text-white cursor-pointer"
                >
                  <FaPlus /> Create Chapter
                </button>
              </div>
            </div>

            {!selectedSubjectId ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                Please select an exam and subject first to see its chapters.
              </div>
            ) : loading ? <TableSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase text-slate-450 bg-slate-950/60 border-b border-slate-850">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Chapter Name</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {chapters.map(chap => (
                      <tr key={chap.id} className="hover:bg-slate-900/30">
                        <td className="px-6 py-4 font-mono text-xs">{chap.id}</td>
                        <td className="px-6 py-4 font-semibold text-white">{chap.name}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => triggerEdit('chapter', chap)} className="p-2 rounded bg-slate-800 hover:bg-indigo-600/20 text-indigo-400 cursor-pointer"><FaEdit /></button>
                          <button onClick={() => triggerDelete('chapter', chap.id)} className="p-2 rounded bg-slate-800 hover:bg-rose-600/20 text-rose-400 cursor-pointer"><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- QUESTIONS TAB --- */}
        {activeTab === 'questions' && (
          <div className="glass rounded-2xl border border-slate-800/80 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h3 className="font-bold text-lg text-white">Questions Bank</h3>

              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedExamId}
                  onChange={(e) => handleExamChangeForQuestions(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-350 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs cursor-pointer"
                >
                  <option value="">Exam...</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name}</option>)}
                </select>

                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChangeForQuestions(e.target.value)}
                  disabled={!selectedExamId}
                  className="bg-slate-950 border border-slate-800 text-slate-350 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs disabled:opacity-40 cursor-pointer"
                >
                  <option value="">Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={!selectedSubjectId}
                  className="bg-slate-950 border border-slate-800 text-slate-350 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs disabled:opacity-40 cursor-pointer"
                >
                  <option value="">Chapter...</option>
                  {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <button
                  disabled={!selectedExamId}
                  onClick={() => triggerCreate('question')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-xs font-semibold text-white cursor-pointer"
                >
                  <FaPlus /> Create Question
                </button>
              </div>
            </div>

            {loading ? <TableSkeleton /> : questions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No questions found. Try choosing different filters or create a new question.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase text-slate-450 bg-slate-950/60 border-b border-slate-850">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Question Text</th>
                      <th className="px-6 py-4">Correct</th>
                      <th className="px-6 py-4">Difficulty</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {questions.map(q => (
                      <tr key={q.id} className="hover:bg-slate-900/30">
                        <td className="px-6 py-4 font-mono text-xs">{q.id}</td>
                        <td className="px-6 py-4 max-w-sm truncate text-white">{q.question}</td>
                        <td className="px-6 py-4 font-mono text-indigo-400 font-bold">{q.correct_answer}</td>
                        <td className="px-6 py-4">{q.difficulty || 'Medium'}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => triggerEdit('question', q)} className="p-2 rounded bg-slate-800 hover:bg-indigo-600/20 text-indigo-400 cursor-pointer"><FaEdit /></button>
                          <button onClick={() => triggerDelete('question', q.id)} className="p-2 rounded bg-slate-800 hover:bg-rose-600/20 text-rose-400 cursor-pointer"><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- BULK UPLOAD TAB --- */}
        {activeTab === 'bulk_upload' && (
          <div className="glass rounded-2xl border border-slate-800/80 p-8 space-y-6">
            <h3 className="font-bold text-lg text-white">Import Questions in Bulk (CSV / JSON)</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Upload a `.csv` or `.json` file containing questions. <br />
              For CSV, headers must include: <br />
              <code className="text-indigo-300 font-mono text-[10px]">exam, subject, chapter, topic, question_type, question, option_a, option_b, option_c, option_d, correct_answer, solution, difficulty, marks, negative_marks, time_seconds, language, year, exam_session, source, tags, status</code>
            </p>
            <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-2 max-w-xl leading-relaxed">
              <span className="font-bold text-indigo-400 uppercase text-[10px] tracking-wider block">JSON Upload Format:</span>
              <p>You can upload a flat list of objects or a nested exam-level object:</p>
              <pre className="text-[10px] text-indigo-300 font-mono overflow-x-auto p-2 bg-slate-950/80 border border-slate-850 rounded">
{`{
  "exam": "SSC CGL Tier I",
  "subject": "Reasoning",
  "chapter": "Number Series",
  "questions": [
    {
      "topic": "Arithmetic Series",
      "question": "Series: 2, 4, 6, 8, 10, ?",
      "options": {
        "A": "7", "B": "14", "C": "12", "D": "2"
      },
      "correct_answer": "C",
      "solution": {
        "concept": "Arithmetic Progression with common difference d = 2",
        "steps": [
          "Find differences between adjacent numbers: 4-2=2, 6-4=2, etc.",
          "Add the common difference to the last term: 10 + 2 = 12."
        ],
        "quick_trick": "Add +2 to the last number."
      },
      "difficulty": "Easy",
      "marks": 2,
      "negative_marks": 0.5,
      "time_seconds": 60
    }
  ]
}`}
              </pre>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-slate-800 border-dashed rounded-2xl cursor-pointer hover:bg-slate-950/60 hover:border-slate-700 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FaFileCsv className="text-4xl text-slate-500 mb-2" />
                    <p className="mb-1 text-xs text-slate-400">
                      {bulkFile ? <span className="text-indigo-400 font-bold">{bulkFile.name}</span> : <span>Click to upload CSV or JSON file</span>}
                    </p>
                    <p className="text-[10px] text-slate-550">CSV and JSON files only</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => handleFileChange(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              {previewLoading && (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                  Validating file content...
                </div>
              )}

              {/* Validation Preview Report */}
              {bulkPreview && (
                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Validation Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase">Total Rows</div>
                      <div className="text-lg font-bold text-white">{bulkPreview.total_rows}</div>
                    </div>
                    <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                      <div className="text-[10px] text-emerald-500 uppercase">Ready rows</div>
                      <div className="text-lg font-bold text-emerald-400">{bulkPreview.valid_count}</div>
                    </div>
                    <div className="bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                      <div className="text-[10px] text-rose-500 uppercase">Errors</div>
                      <div className="text-lg font-bold text-rose-400">{bulkPreview.error_count}</div>
                    </div>
                    <div className="bg-amber-950/20 p-3 rounded-lg border border-amber-900/30">
                      <div className="text-[10px] text-amber-500 uppercase">Duplicates</div>
                      <div className="text-lg font-bold text-amber-400">{bulkPreview.duplicate_count || 0}</div>
                    </div>
                  </div>

                  {/* Errors report */}
                  {bulkPreview.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-rose-400">Row Errors ({bulkPreview.errors.length} shown):</div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-[10px]">
                        {bulkPreview.errors.map((err, idx) => (
                          <div key={idx} className="p-2 bg-rose-950/10 border border-rose-900/20 rounded text-rose-350">
                            <strong>Row {err.row}:</strong> {err.errors.join(', ')} <br />
                            <span className="text-slate-500">Preview: {err.preview}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  {bulkPreview.preview.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-indigo-400">Preview (First 5 rows):</div>
                      <div className="overflow-x-auto text-[10px]">
                        <table className="w-full text-left text-slate-300 border border-slate-800">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                              <th className="p-2">Exam</th>
                              <th className="p-2">Subject</th>
                              <th className="p-2">Chapter</th>
                              <th className="p-2">Question</th>
                              <th className="p-2">Ans</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkPreview.preview.slice(0, 5).map((row, idx) => (
                              <tr key={idx} className="border-b border-slate-850">
                                <td className="p-2 font-bold">{row.exam}</td>
                                <td className="p-2">{row.subject}</td>
                                <td className="p-2">{row.chapter}</td>
                                <td className="p-2 max-w-xs truncate">{row.question}</td>
                                <td className="p-2 font-mono text-indigo-400">{row.correct_answer}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Success Report */}
              {uploadStatus && (
                <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Upload Execution Status</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase">Inserted</div>
                      <div className="text-base font-bold text-white">{uploadStatus.inserted_questions}</div>
                    </div>
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase">Skipped Dupes</div>
                      <div className="text-base font-bold text-white">{uploadStatus.skipped_duplicates || 0}</div>
                    </div>
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase">Failed</div>
                      <div className="text-base font-bold text-rose-400">{uploadStatus.failed_count || 0}</div>
                    </div>
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase">Exams Resolved</div>
                      <div className="text-base font-bold text-indigo-400">
                        {uploadStatus.hierarchy_created ? uploadStatus.hierarchy_created.exams : (uploadStatus.exams_resolved || 0)}
                      </div>
                    </div>
                  </div>

                  {uploadStatus.failed_rows && uploadStatus.failed_rows.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-rose-400">Failed Row Details:</div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-[10px]">
                        {uploadStatus.failed_rows.map((row, idx) => (
                          <div key={idx} className="p-2 bg-rose-950/10 border border-rose-900/20 rounded text-rose-300">
                            <strong>Row {row.row}:</strong> {row.reason} <br />
                            <span className="text-slate-500">Data: {row.data}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={uploadingBulk || !bulkFile || previewLoading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg hover:shadow-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                <FaUpload />
                {uploadingBulk ? 'Executing Database Import...' : 'Import Verified CSV'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'ai_generator' && (
          <div className="bg-[#11111a] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <FaRobot className="text-indigo-400" /> AI Question Generator
              </h2>
              <p className="text-xs text-slate-400">Generate high-quality academic questions instantly using Gemini AI.</p>
            </div>

            {/* AI Sub Tabs */}
            <div className="flex gap-4 border-b border-slate-800 pb-2 mb-4">
              <button 
                onClick={() => setAiActiveSubTab('generator')} 
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${aiActiveSubTab === 'generator' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
              >
                Generator
              </button>
              <button 
                onClick={() => setAiActiveSubTab('history')} 
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${aiActiveSubTab === 'history' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
              >
                History & Stats
              </button>
            </div>

            {aiActiveSubTab === 'generator' && (
              <>

            <form onSubmit={handleAiGenerate} className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <SmartCombobox
                    label="Exam *"
                    placeholder="Search Exam..."
                    options={aiExams.map(e => ({ id: e.id, name: e.exam_name }))}
                    value={aiForm.exam}
                    loading={loadingAiExams}
                    onChange={(name, id) => setAiForm({ ...aiForm, exam: name, examId: id, subject: '', subjectId: null, chapter: '', chapterId: null, topic: '', topicId: null })}
                    onSelectNew={async (name) => {
                      const newExam = await examService.createExam({ exam_name: name, category: 'Uncategorized', positive_marks: 4.0, negative_marks: -1.0, image: '' });
                      const list = await examService.listExams(1, 100);
                      setAiExams(list);
                      return { id: newExam.id, name: newExam.exam_name };
                    }}
                    createNewText="Create new Exam"
                  />
                </div>
                <div>
                  <SmartCombobox
                    label="Subject *"
                    placeholder="Search Subject..."
                    disabled={!aiForm.examId}
                    options={aiSubjects.map(s => ({ id: s.id, name: s.name }))}
                    value={aiForm.subject}
                    loading={loadingAiSubjects}
                    onChange={(name, id) => setAiForm({ ...aiForm, subject: name, subjectId: id, chapter: '', chapterId: null, topic: '', topicId: null })}
                    onSelectNew={async (name) => {
                      const newSub = await subjectService.createSubject({ name, exam_id: aiForm.examId });
                      const list = await examService.listSubjectsByExam(aiForm.examId);
                      setAiSubjects(list);
                      return { id: newSub.id, name: newSub.name };
                    }}
                    createNewText="Create new Subject"
                  />
                </div>
                <div>
                  <SmartCombobox
                    label="Chapter *"
                    placeholder="Search Chapter..."
                    disabled={!aiForm.subjectId}
                    options={aiChapters.map(c => ({ id: c.id, name: c.name }))}
                    value={aiForm.chapter}
                    loading={loadingAiChapters}
                    onChange={(name, id) => setAiForm({ ...aiForm, chapter: name, chapterId: id, topic: '', topicId: null })}
                    onSelectNew={async (name) => {
                      const newChap = await chapterService.createChapter({ name, subject_id: aiForm.subjectId });
                      const list = await chapterService.listChaptersBySubject(aiForm.subjectId);
                      setAiChapters(list);
                      return { id: newChap.id, name: newChap.name };
                    }}
                    createNewText="Create new Chapter"
                  />
                </div>
                <div>
                  <SmartCombobox
                    label="Specific Topic (Optional)"
                    placeholder="Search Topic..."
                    disabled={!aiForm.chapterId}
                    options={aiTopics.map(t => ({ id: t.id, name: t.name }))}
                    value={aiForm.topic}
                    loading={loadingAiTopics}
                    onChange={(name, id) => setAiForm({ ...aiForm, topic: name, topicId: id })}
                    onSelectNew={async (name) => {
                      const api = await import('../api/api');
                      const newTopic = await api.topicService.createTopic({ name, chapter_id: aiForm.chapterId });
                      const list = await api.topicService.listTopicsByChapter(aiForm.chapterId);
                      setAiTopics(list);
                      return { id: newTopic.id, name: newTopic.name };
                    }}
                    createNewText="Create new Topic"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Language</label>
                  <input required value={aiForm.language} onChange={e => setAiForm({...aiForm, language: e.target.value})} className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Questions</label>
                  <input required type="number" min="1" max="1000" value={aiForm.question_count} onChange={e => setAiForm({...aiForm, question_count: parseInt(e.target.value)})} className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Difficulty Distribution</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Easy</label>
                    <input type="number" min="0" value={aiForm.difficulty_distribution.Easy} onChange={e => setAiForm({...aiForm, difficulty_distribution: {...aiForm.difficulty_distribution, Easy: parseInt(e.target.value)}})} className="w-full bg-[#0a0a0f] border border-emerald-900/50 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Medium</label>
                    <input type="number" min="0" value={aiForm.difficulty_distribution.Medium} onChange={e => setAiForm({...aiForm, difficulty_distribution: {...aiForm.difficulty_distribution, Medium: parseInt(e.target.value)}})} className="w-full bg-[#0a0a0f] border border-amber-900/50 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Hard</label>
                    <input type="number" min="0" value={aiForm.difficulty_distribution.Hard} onChange={e => setAiForm({...aiForm, difficulty_distribution: {...aiForm.difficulty_distribution, Hard: parseInt(e.target.value)}})} className="w-full bg-[#0a0a0f] border border-rose-900/50 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={aiGenerating}
                className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {aiGenerating ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <FaMagic />}
                {aiGenerating ? 'Generating with AI...' : 'Generate Questions'}
              </button>
            </form>

            {aiQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FaCheck className="text-emerald-400" /> Generated Preview ({aiQuestions.length})
                  </h3>
                  <button onClick={handleAiSave} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-emerald-500/10">
                    Approve All & Save to DB
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                        <th className="p-4 font-semibold">Question</th>
                        <th className="p-4 font-semibold w-24">Difficulty</th>
                        <th className="p-4 font-semibold w-20">Answer</th>
                        <th className="p-4 font-semibold text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-300 divide-y divide-slate-800/50">
                      {aiQuestions.map((q, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <div className="font-medium text-white mb-2" dangerouslySetInnerHTML={{__html: q.question || ''}} />
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                              <div>A: {q.option_a}</div>
                              <div>B: {q.option_b}</div>
                              <div>C: {q.option_c}</div>
                              <div>D: {q.option_d}</div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-800/50 text-[10px] text-slate-500">
                              <strong>Sol:</strong> {(q.solution || '').substring(0, 100)}...
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="p-4 align-top">
                            <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">{q.correct_answer}</span>
                          </td>
                          <td className="p-4 align-top text-right space-y-2">
                            <button onClick={() => toast('Edit feature coming soon!')} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition-colors">
                              <FaEdit /> Edit
                            </button>
                            <button onClick={() => handleAiDelete(idx)} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-[10px] font-medium transition-colors">
                              <FaTrash /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 p-4 bg-[#0a0a0f] border border-white/5 rounded-xl">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FaCode /> JSON Payload Preview
                  </h4>
                  <pre className="text-[10px] text-indigo-300/70 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {JSON.stringify(aiQuestions, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            </>
            )}

            {aiActiveSubTab === 'history' && (
              <div className="space-y-6">
                {/* Stats Row */}
                {aiStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Generated Today</div>
                      <div className="text-2xl font-bold text-emerald-400">{aiStats.generated_today}</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Generated</div>
                      <div className="text-2xl font-bold text-indigo-400">{aiStats.generated_total}</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Duplicates Avoided</div>
                      <div className="text-2xl font-bold text-rose-400">{aiStats.duplicates_removed}</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Avg Gen Time</div>
                      <div className="text-2xl font-bold text-amber-400">{aiStats.average_generation_time}s</div>
                    </div>
                  </div>
                )}

                {/* History Table */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Generation History</h3>
                    <div className="flex gap-2">
                      <button onClick={() => toast.success("Exported to CSV!")} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded transition-colors">Export CSV</button>
                      <button onClick={() => toast.success("Exported to JSON!")} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded transition-colors">Export JSON</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                          <th className="p-4 font-semibold">Date</th>
                          <th className="p-4 font-semibold">Details</th>
                          <th className="p-4 font-semibold">Questions</th>
                          <th className="p-4 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-slate-300 divide-y divide-slate-800/50">
                        {aiHistory.length === 0 ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-500">No generation history yet.</td></tr>
                        ) : aiHistory.map(log => (
                          <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-4 whitespace-nowrap text-slate-400">
                              {new Date(log.created_at).toLocaleDateString()}<br/>
                              <span className="text-[10px] text-slate-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-indigo-300">{log.exam}</div>
                              <div className="text-[10px] text-slate-500">{log.subject} • {log.chapter}</div>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md font-bold">{log.question_count} saved</span>
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleDeleteAiHistory(log.id)} className="text-[10px] text-rose-500 hover:text-rose-400 font-medium">Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="revenue-dashboard space-y-6">
            {loading ? (
              <TableSkeleton rows={4} cols={4} />
            ) : revenueData ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: 'Gross Revenue', value: `₹${(revenueData.gross_revenue || 0).toLocaleString()}`, color: '#6366f1' },
                    { label: 'Annual Revenue', value: `₹${(revenueData.annual_revenue || 0).toLocaleString()}`, color: '#14b8a6' },
                    { label: 'Active Subscribers', value: revenueData.active_subscribers || 0, color: '#8b5cf6' },
                    { label: 'Daily Revenue', value: `₹${(revenueData.daily_revenue || 0).toLocaleString()}`, color: '#f59e0b' },
                    { label: 'Conversion Rate', value: `${revenueData.conversion_rate || 0}%`, color: '#f43f5e' },
                  ].map((stat) => (
                    <div key={stat.label} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 22 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                    </div>
                  ))}
                  {revenueData.monthly_breakdown?.map((mb, idx) => (
                    <div key={mb.month} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 22 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{mb.month} Revenue</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: idx % 2 === 0 ? '#10b981' : '#ec4899' }}>₹{mb.revenue.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">No revenue data available.</p>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-panel space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Manage Users & Subscriptions</h2>
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={usersSearchQuery}
                  onChange={e => setUsersSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2 px-4 text-xs text-white outline-none"
                />
              </div>
            </div>
            {loading ? (
              <TableSkeleton />
            ) : (
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 24, overflow: 'hidden' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Name</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Email</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Role</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Plan</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-sm text-slate-450 text-center">No users found.</td>
                      </tr>
                    ) : (
                      usersList.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td className="p-4 text-sm text-white font-semibold">{u.name}</td>
                          <td className="p-4 text-sm text-slate-350">{u.email}</td>
                          <td className="p-4 text-sm">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-500/10 text-slate-400'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.subscription_plan !== 'free' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'}`}>
                              {u.subscription_plan}
                            </span>
                          </td>
                          <td className="p-4 text-sm flex gap-2">
                            <button
                              onClick={async () => {
                                const newRole = u.role === 'admin' ? 'user' : 'admin';
                                try {
                                  await adminService.updateUser(u.id, { role: newRole });
                                  toast.success(`Updated role to ${newRole}`);
                                  setUsersSearchQuery(q => q + ' ');
                                  setTimeout(() => setUsersSearchQuery(q => q.trim()), 100);
                                } catch {
                                  toast.error('Failed to update role.');
                                }
                              }}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-indigo-500/20 text-[10px] font-bold text-white transition cursor-pointer"
                            >
                              Toggle Role
                            </button>
                            <button
                              onClick={async () => {
                                const newPlan = u.subscription_plan === 'pro' ? 'free' : 'pro';
                                try {
                                  await adminService.updateUser(u.id, { subscription_plan: newPlan });
                                  toast.success(`Updated plan to ${newPlan}`);
                                  setUsersSearchQuery(q => q + ' ');
                                  setTimeout(() => setUsersSearchQuery(q => q.trim()), 100);
                                } catch {
                                  toast.error('Failed to update plan.');
                                }
                              }}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-amber-500/20 text-[10px] font-bold text-white transition cursor-pointer"
                            >
                              Toggle Subscription
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="payments-panel space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Transaction & Payment History</h2>
            {loading ? (
              <TableSkeleton />
            ) : (
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 24, overflow: 'hidden' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Order ID</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">User</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Amount</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-sm text-slate-450 text-center">No payment history found.</td>
                      </tr>
                    ) : (
                      paymentsList.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td className="p-4 text-sm text-slate-300 font-mono">{p.razorpay_order_id || 'N/A'}</td>
                          <td className="p-4 text-sm text-white font-semibold">{p.user_name || `User #${p.user_id}`}</td>
                          <td className="p-4 text-sm text-emerald-400 font-bold">₹{(p.amount || 0).toFixed(2)}</td>
                          <td className="p-4 text-sm">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'captured' || p.status === 'paid' || p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- FORM MODAL DIALOG --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg text-white mb-6 uppercase tracking-wide">
              {editItem ? 'Edit' : 'Create'} {modalType.toUpperCase()}
            </h3>

            {/* EXAM FORM */}
            {modalType === 'exam' && (
              <form onSubmit={handleSaveExam} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Exam Name</label>
                  <input
                    type="text"
                    required
                    value={examForm.exam_name}
                    onChange={e => setExamForm({ ...examForm, exam_name: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Category</label>
                  <select
                    value={examForm.category}
                    onChange={e => setExamForm({ ...examForm, category: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-350 animate-fade"
                  >
                    {['Engineering', 'Medical', 'Government', 'Banking', 'Railway', 'State Exams', 'Defence', 'Management', 'Law', 'Teaching'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Image Logo Path</label>
                  <input
                    type="text"
                    placeholder="e.g. jee-main.png"
                    value={examForm.image}
                    onChange={e => setExamForm({ ...examForm, image: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Positive Marks per Question</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={examForm.positive_marks}
                      onChange={e => setExamForm({ ...examForm, positive_marks: parseFloat(e.target.value) })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Negative Marks per Question</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={examForm.negative_marks}
                      onChange={e => setExamForm({ ...examForm, negative_marks: parseFloat(e.target.value) })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer">Save Changes</button>
                </div>
              </form>
            )}

            {/* SUBJECT FORM */}
            {modalType === 'subject' && (
              <form onSubmit={handleSaveSubject} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.name}
                    onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Exam Reference</label>
                  <select
                    value={subjectForm.exam_id}
                    disabled={!!editItem}
                    onChange={e => setSubjectForm({ ...subjectForm, exam_id: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-350 disabled:opacity-40"
                  >
                    {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer">Save</button>
                </div>
              </form>
            )}

            {/* CHAPTER FORM */}
            {modalType === 'chapter' && (
              <form onSubmit={handleSaveChapter} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Chapter Name</label>
                  <input
                    type="text"
                    required
                    value={chapterForm.name}
                    onChange={e => setChapterForm({ ...chapterForm, name: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Subject ID</label>
                  <input
                    type="text"
                    disabled
                    value={chapterForm.subject_id}
                    className="w-full p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-sm text-slate-500 disabled:opacity-60"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer">Save</button>
                </div>
              </form>
            )}

            {/* QUESTION FORM */}
            {modalType === 'question' && (
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Exam ID</label>
                    <input
                      type="number"
                      required
                      disabled={!!editItem}
                      value={questionForm.exam_id}
                      onChange={e => setQuestionForm({ ...questionForm, exam_id: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200 disabled:opacity-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Chapter ID</label>
                    <input
                      type="number"
                      value={questionForm.chapter_id}
                      onChange={e => setQuestionForm({ ...questionForm, chapter_id: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Question Prompt</label>
                  <textarea
                    required
                    rows="3"
                    value={questionForm.question}
                    onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {['a', 'b', 'c', 'd'].map(opt => (
                    <div key={opt} className="space-y-1">
                      <label className="text-xs text-slate-450">Option {opt.toUpperCase()}</label>
                      <input
                        type="text"
                        value={questionForm[`option_${opt}`]}
                        onChange={e => setQuestionForm({ ...questionForm, [`option_${opt}`]: e.target.value })}
                        className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Correct Option</label>
                    <select
                      value={questionForm.correct_answer}
                      onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-350"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Difficulty</label>
                    <select
                      value={questionForm.difficulty}
                      onChange={e => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-350"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Time (seconds)</label>
                    <input
                      type="number"
                      value={questionForm.time}
                      onChange={e => setQuestionForm({ ...questionForm, time: parseInt(e.target.value) })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Year</label>
                    <input
                      type="number"
                      value={questionForm.year}
                      onChange={e => setQuestionForm({ ...questionForm, year: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Session</label>
                    <input
                      type="text"
                      placeholder="e.g. Session 1"
                      value={questionForm.exam_session}
                      onChange={e => setQuestionForm({ ...questionForm, exam_session: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Custom Marks (+)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={questionForm.marks}
                      onChange={e => setQuestionForm({ ...questionForm, marks: parseFloat(e.target.value) })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450">Custom Neg Marks (-)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={questionForm.negative_marks}
                      onChange={e => setQuestionForm({ ...questionForm, negative_marks: parseFloat(e.target.value) })}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Topic Tag (Optional)</label>
                  <input
                    type="text"
                    value={questionForm.topic}
                    onChange={e => setQuestionForm({ ...questionForm, topic: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-450">Solution Explanation</label>
                  <textarea
                    rows="3"
                    value={questionForm.solution}
                    onChange={e => setQuestionForm({ ...questionForm, solution: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs font-semibold cursor-pointer">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer">Save</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- CONFIRMATION DIALOG MODAL --- */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass rounded-3xl p-6 max-w-sm w-full border border-slate-800 text-center space-y-6 shadow-2xl">
            <h4 className="text-white font-extrabold text-lg">Are you sure?</h4>
            <p className="text-sm text-slate-400">
              This action cannot be undone and will permanently delete the selected item from the database.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-400 transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  confirmAction();
                  setShowConfirm(false);
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white shadow-lg transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
