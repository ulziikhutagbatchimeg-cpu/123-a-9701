import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { CURRICULUM_CHAPTERS } from '../data/curriculumData';
import { CAMBRIDGE_PAST_PAPERS_2017_2024 } from '../data/pastPapersData';
import { OFFICIAL_PAPERS, OFFICIAL_PAST_PAPERS_PAGE } from '../data/officialPastPapers';
import { TEACHER_PAPER_FILES } from '../data/teacherPaperFiles';
import { paperUploaded, uploadPaper, useAuthUser } from '../lib/cloud';
import { useTeacherOnScreen } from '../lib/viewAs';
import { ExamQuestion, PaperType } from '../types/chemistry';
import { ChemText } from './common/ChemText';
import { ExamModeView } from './ExamModeView';
import { MockTestsView } from './MockTestsView';
import {
  GraduationCap,
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  BookOpen, 
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Search,
  Calendar,
  Layers,
  Award,
  HelpCircle,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Timer,
  ArrowLeft
} from 'lucide-react';

type SortOption = 'difficulty-asc' | 'difficulty-desc' | 'year-desc' | 'year-asc' | 'marks-desc';

export const ExamPrepView: React.FC = () => {
  const { mode } = useLanguage();
  const { addMistake, logExamAnswer, jumpToTopic, customQuestions } = useApp();

  // Filters state
  const [selectedPaper, setSelectedPaper] = useState<PaperType | 'All'>('All');
  const [selectedYear, setSelectedYear] = useState<number | 'All'>('All');
  const [selectedSeries, setSelectedSeries] = useState<'All' | 'M/J' | 'O/N' | 'F/M'>('All');
  const [selectedDifficultyTier, setSelectedDifficultyTier] = useState<'All' | 'easy' | 'medium' | 'hard' | 'distinction'>('All');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Sort state (Default: strict progression from easy to hard)
  const [sortBy, setSortBy] = useState<SortOption>('difficulty-asc');

  // Browse past questions, or switch to the timed Exam Mode
  const [view, setView] = useState<'browse' | 'exam'>('browse');
  // The teacher sees the list of paper files kept on hand, and which of them are in storage
  const { user } = useAuthUser();
  // The teacher's own view only; looking at the site as a student (lib/viewAs) the list is hidden, as for a student
  const teacher = useTeacherOnScreen(user);
  const [paperStatus, setPaperStatus] = useState<Record<string, boolean>>({});
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const checkPapers = async () => {
    const names = TEACHER_PAPER_FILES.flatMap(f => [f.questionFile, f.markSchemeFile].filter((n): n is string => !!n));
    const entries = await Promise.all(names.map(async n => [n, await paperUploaded(`${n}.pdf`)] as const));
    setPaperStatus(Object.fromEntries(entries));
  };

  useEffect(() => {
    if (teacher) checkPapers();
  }, [teacher]);

  // Uploads one PDF to storage under its own name, for example 0620_s22_qp_22.pdf
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadMsg(mode === 'mn' ? 'Зөвхөн PDF файл оруулна.' : 'Only PDF files can be uploaded.');
      return;
    }
    setUploadMsg(mode === 'mn' ? 'Оруулж байна…' : 'Uploading…');
    try {
      await uploadPaper(file);
      setUploadMsg(mode === 'mn' ? `${file.name} амжилттай оруулсан.` : `${file.name} uploaded.`);
      await checkPapers();
    } catch (err) {
      setUploadMsg(mode === 'mn' ? 'Оруулж чадсангүй. Багшийн нэвтрэлтээ шалгана уу.' : 'Upload failed. Check that you are signed in as the teacher.');
    }
  };

  // Interactive user answers and revealed mark schemes
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [revealedMarkSchemes, setRevealedMarkSchemes] = useState<Record<string, boolean>>({});

  // Combine curriculum questions, authentic 2017-2024 past papers, and custom questions
  const allQuestions: ExamQuestion[] = useMemo(() => {
    const curriculumQs = CURRICULUM_CHAPTERS.flatMap(c => c.topics.flatMap(t => t.questions));
    const combined = [...CAMBRIDGE_PAST_PAPERS_2017_2024, ...curriculumQs, ...(customQuestions || [])];
    
    // Deduplicate by id if any duplicates exist
    const uniqueMap = new Map<string, ExamQuestion>();
    combined.forEach(q => {
      if (!uniqueMap.has(q.id)) {
        uniqueMap.set(q.id, q);
      }
    });
    return Array.from(uniqueMap.values());
  }, [customQuestions]);

  // Helper function to calculate a numeric difficulty score (1 to 10)
  const getQuestionDifficultyScore = (q: ExamQuestion): number => {
    if (q.difficultyScore !== undefined) return q.difficultyScore;
    if (q.difficulty === 'easy') return 2;
    if (q.difficulty === 'medium') return 5;
    if (q.difficulty === 'hard') return q.totalMarks >= 5 ? 9 : 7;
    return q.paper === 'Paper 2' ? 2 : q.paper === 'Paper 4' ? 5 : 7;
  };

  // Filter & Sort Logic
  const filteredAndSortedQuestions = useMemo(() => {
    const filtered = allQuestions.filter(q => {
      // Paper filter
      if (selectedPaper !== 'All' && q.paper !== selectedPaper) return false;

      // Year filter
      if (selectedYear !== 'All') {
        if (!q.year || q.year !== selectedYear) return false;
      }

      // Series filter
      if (selectedSeries !== 'All') {
        if (!q.series || q.series !== selectedSeries) return false;
      }

      // Difficulty Tier filter
      const score = getQuestionDifficultyScore(q);
      if (selectedDifficultyTier === 'easy' && score > 3) return false;
      if (selectedDifficultyTier === 'medium' && (score < 4 || score > 6)) return false;
      if (selectedDifficultyTier === 'hard' && (score < 7 || score > 8)) return false;
      if (selectedDifficultyTier === 'distinction' && score < 9) return false;

      // Chapter filter
      if (selectedChapterId !== 'all' && q.chapterId !== selectedChapterId) return false;

      // Search filter (text, paperCode, syllabusRef, title)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = q.titleEn.toLowerCase().includes(query) || q.titleMn.toLowerCase().includes(query);
        const matchesCode = Boolean(q.paperCode?.toLowerCase().includes(query));
        const matchesRef = q.syllabusRef.toLowerCase().includes(query);
        const matchesText = q.questionTextEn.toLowerCase().includes(query) || q.questionTextMn.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCode && !matchesRef && !matchesText) return false;
      }

      return true;
    });

    // Strictly sort by selected sort option
    return filtered.sort((a, b) => {
      const scoreA = getQuestionDifficultyScore(a);
      const scoreB = getQuestionDifficultyScore(b);
      const yearA = a.year || 2020;
      const yearB = b.year || 2020;

      if (sortBy === 'difficulty-asc') {
        if (scoreA !== scoreB) return scoreA - scoreB;
        if (a.totalMarks !== b.totalMarks) return a.totalMarks - b.totalMarks;
        return yearB - yearA;
      }
      if (sortBy === 'difficulty-desc') {
        if (scoreA !== scoreB) return scoreB - scoreA;
        if (a.totalMarks !== b.totalMarks) return b.totalMarks - a.totalMarks;
        return yearB - yearA;
      }
      if (sortBy === 'year-desc') {
        if (yearA !== yearB) return yearB - yearA;
        return scoreA - scoreB;
      }
      if (sortBy === 'year-asc') {
        if (yearA !== yearB) return yearA - yearB;
        return scoreA - scoreB;
      }
      if (sortBy === 'marks-desc') {
        if (a.totalMarks !== b.totalMarks) return b.totalMarks - a.totalMarks;
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [allQuestions, selectedPaper, selectedYear, selectedSeries, selectedDifficultyTier, selectedChapterId, searchQuery, sortBy]);

  const handleSelectOption = (q: ExamQuestion, optionId: 'A' | 'B' | 'C' | 'D') => {
    setUserAnswers(prev => ({ ...prev, [q.id]: optionId }));
    setRevealedMarkSchemes(prev => ({ ...prev, [q.id]: true }));

    const isCorrect = optionId === q.correctOption;
    logExamAnswer(q, isCorrect ? 1 : 0);

    if (!isCorrect) {
      addMistake({
        questionId: q.id,
        topicId: q.topicId,
        syllabusRef: q.syllabusRef,
        paper: q.paper,
        questionTitleEn: q.titleEn,
        questionTitleMn: q.titleMn,
        studentAnswer: `Option ${optionId}: ${q.options?.find(o => o.id === optionId)?.textEn || ''}`,
        correctAnswer: `Option ${q.correctOption}: ${q.options?.find(o => o.id === q.correctOption)?.textEn || ''}`,
        misconceptionDiagnosisEn: q.misconceptionDiagnosisEn,
        misconceptionDiagnosisMn: q.misconceptionDiagnosisMn
      });
    }
  };

  const toggleRevealMarkScheme = (qId: string) => {
    setRevealedMarkSchemes(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const resetAllProgress = () => {
    setUserAnswers({});
    setRevealedMarkSchemes({});
  };

  if (view === 'exam') {
    return (
      <div className="space-y-4 pb-20">
        <button
          onClick={() => setView('browse')}
          className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{mode === 'mn' ? 'Past papers рүү буцах' : 'Back to past papers'}</span>
        </button>
        <ExamModeView />
      </div>
    );
  }

  // Stats calculation
  const totalAvailable = filteredAndSortedQuestions.length;
  const totalAnswered = Object.keys(userAnswers).length;

  return (
    <div className="space-y-6 pb-20">
      <MockTestsView />
      {/* Top Banner & Assessment Engine Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-teal-300 font-mono text-[11px] font-bold uppercase tracking-wider border border-emerald-500/30">
                0620 practice questions · Papers 2, 4 & 6
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Papers 2, 4 & 6 · M/J, O/N, F/M
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-teal-400" />
              <span>
                {mode === 'mn'
                  ? 'Дасгалын асуултууд (хөнгөнөөс хүнд) ба албан ёсны шалгалт'
                  : 'Practice questions, easy to hard, and the official papers'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              {mode === 'mn'
                ? 'Энэ курсэд зориулж бичсэн дасгалын асуултуудыг хүндрэлийн түвшингээр (Level 1–10) эрэмбэлсэн. Эдгээр нь Cambridge-ийн шалгалтын хуулбар биш. Албан ёсны шалгалтыг доор холбоосоор харуулсан.'
                : 'Practice questions written for this course, arranged from Level 1 foundation recall to Level 10 multi-step distinction. They are not copies of the Cambridge papers; the official papers are linked below.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-chemistry-0620/past-papers/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{mode === 'mn' ? 'Cambridge-ийн албан ёсны past papers' : 'Official Cambridge past papers'}</span>
              </a>
              <a
                href="https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-chemistry-0620/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{mode === 'mn' ? '0620 хөтөлбөрийн хуудас' : '0620 syllabus page'}</span>
              </a>
            </div>
            {/* The official papers, as links to the Cambridge website. Only Papers 2, 4 and 6 are listed here. */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                {mode === 'mn' ? 'Албан ёсны шалгалт (Paper 2, 4, 6)' : 'Official papers (Papers 2, 4 & 6)'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {OFFICIAL_PAPERS.map(p => (
                  <div key={p.questionUrl} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{p.paper}</span>
                      <span className="text-slate-500 dark:text-slate-400"> · {p.session} · {p.code}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a href={p.questionUrl} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-800 dark:text-teal-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                        {mode === 'mn' ? 'Асуулт' : 'Question paper'}
                      </a>
                      <a href={p.markSchemeUrl} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        {mode === 'mn' ? 'Mark scheme' : 'Mark scheme'}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              <a href={OFFICIAL_PAST_PAPERS_PAGE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-teal-300 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{mode === 'mn' ? 'Бусад жил, 10/11 сарын шалгалтыг албан ёсны хуудсаас харах' : 'Other years and the Oct/Nov sessions: official page'}</span>
              </a>
            </div>
            {/* Teacher only: the paper files the teacher keeps. The PDFs are not copied into the app. */}
            {teacher && (
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    {mode === 'mn' ? 'Багшийн файлын жагсаалт (зөвхөн багшид)' : 'Teacher file list (teacher only)'}
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                    <span>{mode === 'mn' ? 'PDF оруулах (Firebase)' : 'Upload PDF (Firebase)'}</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} />
                  </label>
                </div>
                {uploadMsg && <p className="text-[11px] text-slate-600 dark:text-slate-300">{uploadMsg}</p>}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold">{mode === 'mn' ? 'Жил' : 'Year'}</th>
                        <th className="text-left px-3 py-2 font-bold">{mode === 'mn' ? 'Сесси' : 'Series'}</th>
                        <th className="text-left px-3 py-2 font-bold">Paper</th>
                        <th className="text-left px-3 py-2 font-bold">{mode === 'mn' ? 'Хувилбар' : 'Variant'}</th>
                        <th className="text-left px-3 py-2 font-bold">{mode === 'mn' ? 'Асуулт' : 'Question'}</th>
                        <th className="text-left px-3 py-2 font-bold">Mark scheme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TEACHER_PAPER_FILES.map(f => (
                        <tr key={f.questionFile} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="px-3 py-1.5 font-mono">{f.year}</td>
                          <td className="px-3 py-1.5">{f.series}</td>
                          <td className="px-3 py-1.5">{f.paper}</td>
                          <td className="px-3 py-1.5">{f.variant}</td>
                          <td className="px-3 py-1.5 font-mono">
                            {f.questionFile} <span className={paperStatus[f.questionFile] ? 'text-emerald-600' : 'text-slate-400'}>{paperStatus[f.questionFile] ? '✓' : '—'}</span>
                          </td>
                          <td className="px-3 py-1.5 font-mono">
                            {f.markSchemeFile ? (
                              <>
                                {f.markSchemeFile} <span className={paperStatus[f.markSchemeFile] ? 'text-emerald-600' : 'text-slate-400'}>{paperStatus[f.markSchemeFile] ? '✓' : '—'}</span>
                              </>
                            ) : (
                              mode === 'mn' ? 'байхгүй' : 'missing'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {mode === 'mn'
                    ? 'Байхгүй: 2018, 2025, 2026 оны бүх шалгалт; P6-гийн mark scheme; 2020–2022 оны ихэнх mark scheme.'
                    : 'Missing: all of 2018, 2025 and 2026; Paper 6 mark schemes; most 2020–2022 mark schemes.'}
                </p>
              </div>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {mode === 'mn'
                ? 'Албан ёсны PDF-үүд Cambridge-ийн сайтаас нээгдэнэ. Татахад Cambridge School Support Hub-д нэвтрэх шаардлагатай байж магадгүй. Энэ сайт PDF-ийг хуулж нийтэлдэггүй.'
                : 'Official PDFs open on the Cambridge website and may need a School Support Hub login to download. This site does not copy or host the PDFs.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setView('exam')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{mode === 'mn' ? 'Шалгалтын горим (цагтай)' : 'Exam Mode (timed)'}</span>
            </button>
            <button
              onClick={resetAllProgress}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{mode === 'mn' ? 'Хариултуудыг цэвэрлэх' : 'Reset Responses'}</span>
            </button>
          </div>
        </div>

        {/* Difficulty Progression Ladder (Хөнгөнөөс хүнд маш нарийн зүй тогтлоор) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
              <span>{mode === 'mn' ? 'Хүндрэлийн түвшин (Difficulty Progression Ladder):' : 'Progressive Difficulty Ladder:'}</span>
            </span>
            <span className="text-slate-400 text-[11px]">
              {mode === 'mn' ? `${totalAvailable} даалгавар шүүгдсэн` : `${totalAvailable} questions shown`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              onClick={() => setSelectedDifficultyTier('All')}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                selectedDifficultyTier === 'All'
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-transparent font-black shadow-md ring-2 ring-emerald-400/40'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="text-[10px] font-mono opacity-80">{mode === 'mn' ? 'Бүх түвшин' : 'All Levels'}</div>
              <div className="text-xs font-black">Level 1–10</div>
            </button>

            <button
              onClick={() => setSelectedDifficultyTier('easy')}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                selectedDifficultyTier === 'easy'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent font-black shadow-md ring-2 ring-emerald-400/40'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-teal-300 hover:bg-emerald-100'
              }`}
            >
              <div className="text-[10px] font-mono font-bold text-emerald-700 dark:text-teal-400">
                {mode === 'mn' ? 'Хялбар · Суурь' : 'Foundation'}
              </div>
              <div className="text-xs font-black">Level 1–3</div>
            </button>

            <button
              onClick={() => setSelectedDifficultyTier('medium')}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                selectedDifficultyTier === 'medium'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent font-black shadow-md ring-2 ring-amber-400/40'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <div className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
                {mode === 'mn' ? 'Дунд · Хэрэглээ' : 'Application'}
              </div>
              <div className="text-xs font-black">Level 4–6</div>
            </button>

            <button
              onClick={() => setSelectedDifficultyTier('hard')}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                selectedDifficultyTier === 'hard'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent font-black shadow-md ring-2 ring-purple-400/40'
                  : 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300 hover:bg-purple-100'
              }`}
            >
              <div className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-400">
                {mode === 'mn' ? 'Хүнд · Шинжилгээ' : 'Extended'}
              </div>
              <div className="text-xs font-black">Level 7–8</div>
            </button>

            <button
              onClick={() => setSelectedDifficultyTier('distinction')}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                selectedDifficultyTier === 'distinction'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent font-black shadow-md ring-2 ring-rose-400/40'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <div className="text-[10px] font-mono font-bold text-rose-700 dark:text-rose-400">
                {mode === 'mn' ? 'Маш хүнд · Онцлох' : 'Distinction / P6 Q4'}
              </div>
              <div className="text-xs font-black">Level 9–10</div>
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Filter Controls: Paper, Year, Series, Sort, Chapter, Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs pt-2">
          {/* Paper Type Selector */}
          <div className="space-y-1">
            <span className="text-slate-500 font-bold block">
              {mode === 'mn' ? 'Шалгалтын төрөл (Paper):' : 'Paper Type:'}
            </span>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              {(['All', 'Paper 2', 'Paper 4', 'Paper 6'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPaper(p)}
                  className={`py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                    selectedPaper === p
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {p === 'All' ? (mode === 'mn' ? 'Бүгд' : 'All') : p.replace('Paper ', 'P')}
                </button>
              ))}
            </div>
          </div>

          {/* Year Selector (2017 to 2024) */}
          <div className="space-y-1">
            <span className="text-slate-500 font-bold block flex items-center justify-between">
              <span>{mode === 'mn' ? 'Шалгалтын он (Year):' : 'Exam Year:'}</span>
              <span className="text-[10px] text-emerald-600 font-mono">2017–2024</span>
            </span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl p-2 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">{mode === 'mn' ? 'Бүх онууд (2017–2024)' : 'All Years (2017–2024)'}</option>
              {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017].map(yr => (
                <option key={yr} value={yr}>
                  {yr} {yr >= 2023 ? '★ New Syllabus' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown (Strict Difficulty Default) */}
          <div className="space-y-1">
            <span className="text-slate-500 font-bold block flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-emerald-600" />
              <span>{mode === 'mn' ? 'Эрэмбэлэх дараалал:' : 'Sort Order:'}</span>
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="difficulty-asc">
                {mode === 'mn' ? '★ Хөнгөнөөс хүнд рүү (Easy ➔ Hard)' : '★ Difficulty: Easy ➔ Hard'}
              </option>
              <option value="difficulty-desc">
                {mode === 'mn' ? 'Хүндээс хөнгөн рүү (Hard ➔ Easy)' : 'Difficulty: Hard ➔ Easy'}
              </option>
              <option value="year-desc">
                {mode === 'mn' ? 'Оноор: Шинээс хуучин руу (2024 ➔ 2017)' : 'Year: Newest (2024 ➔ 2017)'}
              </option>
              <option value="year-asc">
                {mode === 'mn' ? 'Оноор: Хуучнаас шинэ рүү (2017 ➔ 2024)' : 'Year: Oldest (2017 ➔ 2024)'}
              </option>
              <option value="marks-desc">
                {mode === 'mn' ? 'Онооны жингээр (Ихээс бага)' : 'Marks: Highest First'}
              </option>
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <span className="text-slate-500 font-bold block">
              {mode === 'mn' ? 'Хайх (Код, Сэдэв, Түлхүүр үг):' : 'Search Questions:'}
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={mode === 'mn' ? '0620/42, Моль, Титрлэлт...' : '0620/42, titration, moles...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Questions Stack */}
      <div className="space-y-6">
        {filteredAndSortedQuestions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500 text-sm space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <div className="font-bold text-slate-700 dark:text-slate-300">
              {mode === 'mn' ? 'Сонгосон шүүлтүүрт тохирох past paper даалгавар олдсонгүй.' : 'No past paper questions match the current filter.'}
            </div>
            <p className="text-xs text-slate-400">
              {mode === 'mn' ? 'Шүүлтүүрийг цэвэрлэж эсвэл өөр оныг сонгож үзнэ үү.' : 'Try resetting the filters or selecting another exam year.'}
            </p>
          </div>
        ) : (
          filteredAndSortedQuestions.map((q, index) => {
            const isRevealed = revealedMarkSchemes[q.id];
            const chosenOption = userAnswers[q.id];
            const score = getQuestionDifficultyScore(q);

            // Tier styling
            let tierBadge = {
              label: `Level ${score}/10 · Foundation`,
              badgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
            };
            if (score >= 9) {
              tierBadge = {
                label: `Level ${score}/10 · Distinction / Challenge`,
                badgeClass: 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700 font-black'
              };
            } else if (score >= 7) {
              tierBadge = {
                label: `Level ${score}/10 · Extended Hard`,
                badgeClass: 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-bold'
              };
            } else if (score >= 4) {
              tierBadge = {
                label: `Level ${score}/10 · Core Application`,
                badgeClass: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
              };
            }

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Question Header: Paper Code, Difficulty Level, Syllabus Ref, Marks */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Index Sequence Badge */}
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-center flex items-center justify-center text-[11px]">
                      {index + 1}
                    </span>

                    {/* Official Cambridge Paper Code Badge */}
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-teal-950/80 text-emerald-800 dark:text-teal-300 font-black border border-emerald-300 dark:border-teal-700 shadow-xs">
                      {q.paperCode || `${q.paper} (${q.year || '2023'})`}
                    </span>

                    {/* Difficulty Tier Badge */}
                    <span className={`px-2.5 py-0.5 rounded-lg border font-bold text-[10px] ${tierBadge.badgeClass}`}>
                      {tierBadge.label}
                    </span>

                    {/* Syllabus Ref */}
                    <span className="text-slate-500 font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      Syllabus {q.syllabusRef}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black text-xs">
                      [{q.totalMarks} {q.totalMarks === 1 ? 'Mark' : 'Marks'}]
                    </span>

                    <button
                      onClick={() => jumpToTopic(q.topicId)}
                      className="text-emerald-600 dark:text-teal-400 hover:underline flex items-center gap-1 text-[11px] font-bold"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{mode === 'mn' ? 'Хичээл рүү үсрэх' : 'Topic Notes'}</span>
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  <ChemText>{mode === 'mn' ? q.titleMn : q.titleEn}</ChemText>
                </h3>

                {/* Question Body Text */}
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                  <ChemText>{mode === 'mn' ? q.questionTextMn : q.questionTextEn}</ChemText>
                </p>

                {/* Practical Context if present */}
                {q.practicalContext && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1">
                    <span className="font-bold text-purple-700 dark:text-purple-400 block font-mono">
                      Paper 6 Practical Context:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      <ChemText>{mode === 'mn' ? q.practicalContext.apparatusMn : q.practicalContext.apparatusEn}</ChemText>
                    </p>
                  </div>
                )}

                {/* MCQ Options */}
                {q.type === 'mcq' && q.options && (
                  <div className="space-y-2 pt-2">
                    {q.options.map(opt => {
                      const isChosen = chosenOption === opt.id;
                      const isCorrect = opt.id === q.correctOption;

                      let style = 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80';
                      if (isRevealed) {
                        if (isCorrect) {
                          style = 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold ring-2 ring-emerald-400/50';
                        } else if (isChosen && !isCorrect) {
                          style = 'bg-rose-100 dark:bg-rose-950/70 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-100 font-medium';
                        }
                      }

                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(q, opt.id)}
                          className={`w-full text-left p-3.5 rounded-2xl border text-xs transition-all flex items-start gap-3 shadow-xs ${style}`}
                        >
                          <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-black text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 text-xs">
                            {opt.id}
                          </span>
                          <div className="space-y-1 flex-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                              <ChemText>{mode === 'mn' ? opt.textMn : opt.textEn}</ChemText>
                            </span>
                            {isRevealed && (opt.rationaleEn || opt.rationaleMn) && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-mono">
                                <ChemText>{mode === 'mn' ? opt.rationaleMn : opt.rationaleEn}</ChemText>
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Structured Theory / Practical: Mark Scheme & Model Answer Reveal */}
                <div className="pt-2">
                  <button
                    onClick={() => toggleRevealMarkScheme(q.id)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-emerald-700 dark:text-teal-300 text-xs font-bold transition-colors border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {isRevealed
                        ? (mode === 'mn' ? 'Шалгуур & Загвар хариултыг нуух' : 'Hide Mark Scheme & Model Answer')
                        : (mode === 'mn' ? 'Кэмбрижийн Mark Scheme & Загвар хариултыг харах' : 'View Cambridge Mark Scheme & Model Answer')}
                    </span>
                    {isRevealed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Revealed Detailed Examiner Deck */}
                  {isRevealed && (
                    <div className="mt-3.5 p-5 bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 text-xs animate-fadeIn">
                      {/* Model Answer */}
                      {(q.modelAnswerEn || q.modelAnswerMn) && (
                        <div className="space-y-1.5">
                          <span className="font-mono font-black text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider text-[11px]">
                            {mode === 'mn' ? '★ Кэмбрижийн загвар хариулт (Model Answer):' : '★ Cambridge Model Answer (Full Marks):'}
                          </span>
                          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-slate-800 dark:text-slate-200 font-mono text-xs whitespace-pre-line leading-relaxed">
                            <ChemText>{mode === 'mn' ? q.modelAnswerMn : q.modelAnswerEn}</ChemText>
                          </div>
                        </div>
                      )}

                      {/* Official Marking Criteria Points */}
                      {q.markScheme && q.markScheme.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-mono font-black text-emerald-700 dark:text-teal-400 block border-b border-slate-200 dark:border-slate-800 pb-1 uppercase tracking-wider text-[11px]">
                            {mode === 'mn' ? 'Албан ёсны үнэлгээний оноо задлал (Mark Scheme):' : 'Official Cambridge Mark Scheme Points:'}
                          </span>
                          <div className="space-y-2">
                            {q.markScheme.map((ms, msIdx) => (
                              <div key={ms.pointIndex ?? msIdx} className="space-y-1 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="text-slate-800 dark:text-slate-200 font-medium flex items-start justify-between gap-2">
                                  <span>
                                    <ChemText>{mode === 'mn' ? (ms.criterionMn || ms.pointMn) : (ms.criterionEn || ms.pointEn)}</ChemText>
                                  </span>
                                  <span className="font-mono font-black text-emerald-600 dark:text-teal-400 shrink-0">
                                    [{ms.marks} {ms.marks === 1 ? 'mark' : 'marks'}]
                                  </span>
                                </div>
                                {ms.examinerNoteEn && (
                                  <div className="text-[11px] text-amber-800 dark:text-amber-300/90 pl-2 border-l-2 border-amber-500 font-mono">
                                    Examiner note: <ChemText>{mode === 'mn' ? (ms.examinerNoteMn || ms.examinerNoteEn) : ms.examinerNoteEn}</ChemText>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Misconception Diagnosis */}
                      {(q.misconceptionDiagnosisEn || q.misconceptionDiagnosisMn) && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="font-black font-mono">
                              {mode === 'mn' ? 'Шалгуулагчдын нийтлэг алдаа (Examiner Warning): ' : 'Common Candidate Pitfall: '}
                            </span>
                            <ChemText>{mode === 'mn' ? q.misconceptionDiagnosisMn : q.misconceptionDiagnosisEn}</ChemText>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
