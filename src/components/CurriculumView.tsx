import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp, COURSE_CHOICES } from '../context/AppContext';
import { COURSE_SOLID } from '../lib/courseColour';
import { encourage } from '../lib/encourage';
import { ElectrolysisAnimation } from './ElectrolysisAnimation';
import { TitrationAnimation } from './TitrationAnimation';
import { ParticleAnimation } from './ParticleAnimation';
import { LatticeHolesPicture } from './LatticeHolesPicture';
import { CURRICULUM_CHAPTERS } from '../data/curriculumData';
import { CALC_CHAPTERS } from '../data/calcChapters';
import { COURSEBOOK } from '../data/coursebook';
import { Topic, ExamQuestion, WorkedExample } from '../types/chemistry';
import { ChemText } from './common/ChemText';
import { LessonVisuals } from './LessonVisuals';
import { StatesConceptMap } from './StatesConceptMap';
import { StatesGlossary } from './StatesGlossary';
import { ALEVEL_GLOSSARY } from '../data/alevelGlossary';
import { AnswerPad } from './AnswerPad';

// The official Cambridge programme pages, where the past papers are. The papers are worked from there; their questions are not copied here.
const IGCSE_PAST_PAPERS_URL = 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-chemistry-0620/';
const ALEVEL_PAST_PAPERS_URL = 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/';

// Small per-device flags; a blocked storage just means the flag is not kept
const readFlag = (key: string): boolean => {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

// Kept on this device and on the student's account (lib/accountCopy)
const writeFlag = (key: string) => {
  try {
    keepValue(key, '1');
  } catch {
    // Storage is full or blocked: the mark scheme still opens for this visit
  }
};
import { ALEVEL_CHAPTERS } from '../data/alevelCurriculum';
import { alevelCourse, chapterLevel, visibleChapters } from '../data/alevelSyllabus';
import { LevelBadge } from './LevelBadge';
import { InteractiveChapterOne, QuickCheck, readScores as readStatesScores } from './InteractiveChapterOne';
import { useStudyTime } from '../lib/studyTime';
import { PROGRESS_RESTORED } from '../lib/progressRestore';
import { ElectronFlowLab } from './ElectronFlowLab';
import { SubstitutionMechanismLab } from './SubstitutionMechanismLab';
import { ParticleModelLab } from './ParticleModelLab';
import { AtomicStructureLab, Atomic9701Lab, type AtomicLabTab } from './AtomicStructureLab';
import { BondingLab, IntermolecularLab, type BondingTab, type ImfTab } from './BondingLab';
import { STATES_LESSONS, type QuizItem } from '../data/statesLessons';
import { QUICK_CHECKS } from '../data/statesLessonExtras';
import type { GlossaryTerm } from '../data/statesLessonSupport';
import { ChapterSlides } from './ChapterSlides';
import { CHAPTER_SLIDES } from '../data/chapterSlides';
import { ConceptMap, type ConceptBranch } from './ConceptMap';
import { MASTERY_EVENT, readMastery } from './KeyTermTracker';
import { alevelPlan, alevelUncovered, isoDay, readSchedule, writeSchedule, type Schedule } from '../lib/alevelSchedule';
import { TopicCheck } from './TopicCheck';
import { useKeptAnswers } from '../lib/keptAnswers';
import { ChapterConceptMap, ConceptMapButton, OPEN_CONCEPT_MAP } from './ChapterConceptMap';
import { SelfCheckList } from './SelfCheckList';
import { SELF_CHECK_EVENT, topicProgress, useSelfCheck } from '../lib/selfCheck';
import { CONCEPT_MAPS } from '../data/conceptMaps';
import { keepValue } from '../lib/accountCopy';
import { chapterQuickMcq, quizLevel, topicStructured, topicQuizMcq } from '../lib/topicQuestions';
import { TAXONOMY_LABEL, taxonomyInfo } from '../lib/taxonomy';
import { KeyWordChecklist } from './KeyWordChecklist';
import { KeyWordList } from './KeyWordList';
import { AlevelInquiryLesson } from './AlevelInquiryLesson';
import { ALEVEL_INQUIRY } from '../data/alevelInquiry';
import { LessonSeries, UNLOCK_ABOVE, readScores } from './LessonSeries';
import { ALEVEL_LESSON_SERIES } from '../data/latticeLessons';
import { IGCSE_LESSON_SERIES } from '../data/igcseLessons';
import { CHANGED_KEY, EXPORTED_KEY, makeReport, downloadText, readStored, writeStored } from '../data/progressReport';
import { StudentProgressCard } from './StudentProgressCard';
import { StudentAccount } from './StudentAccount';
import { isTeacher, requestEnrollment, saveStudentProgress, useAuthUser, useEnrollment } from '../lib/cloud';
import { usePreviewAccess, useTeacherOnScreen } from '../lib/viewAs';
import { EnrollmentGate } from './EnrollmentGate';
import { CourseSwitch } from './CourseSwitch';
import {
  Volume2, 
  CheckCircle2, 
  AlertTriangle, 
  Play,
  BookOpen,
  GraduationCap, 
  Layers, 
  Award,
  FlaskConical,
  Download,
  ClipboardCheck,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CHAPTER_TESTS, testUnlocked } from '../data/chapterTests';

// The name the student types once; it goes into the exported report
const NAME_KEY = 'chem_cambridge_student_name';

const readName = (): string => {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
};

const writeName = (name: string) => {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage can be blocked; the name is still used for this export
  }
};

// The 9701 topics that show the atomic-structure lab in their Simulation part, and the part each opens at
const ATOMIC_9701_TOPICS: Record<string, { level: 'as' | 'al'; tab: AtomicLabTab }> = {
  'al-1.1': { level: 'as', tab: 1 },
  'al-1.2': { level: 'as', tab: 2 },
  'al-1.3': { level: 'as', tab: 3 },
  'al-1.4': { level: 'as', tab: 4 },
  'al-2.1': { level: 'as', tab: 2 },
  'al-28.1': { level: 'al', tab: 5 },
  'al-28.3': { level: 'al', tab: 5 }
};

// The topics that show the chemical-bonding lab in their Simulation part: the lab's syllabus switch and the part it opens at
const BONDING_TOPICS: Record<string, { syllabus: '0620' | '9701'; tab: BondingTab }> = {
  'top-2-1': { syllabus: '0620', tab: 1 },
  's-2-5': { syllabus: '0620', tab: 2 },
  's-2-6': { syllabus: '0620', tab: 3 },
  's-2-7': { syllabus: '0620', tab: 3 },
  'al-3.1': { syllabus: '9701', tab: 4 },
  'al-3.2': { syllabus: '9701', tab: 1 },
  'al-3.3': { syllabus: '9701', tab: 3 },
  'al-3.4': { syllabus: '9701', tab: 2 },
  'al-3.5': { syllabus: '9701', tab: 4 },
  'al-3.6': { syllabus: '9701', tab: 5 },
  'al-3.7': { syllabus: '9701', tab: 2 },
  'al-4.2': { syllabus: '9701', tab: 3 }
};

// The topics that show the intermolecular-forces lab in their Simulation part, and the part it opens at
const IMF_TOPICS: Record<string, { syllabus: '0620' | '9701'; tab: ImfTab }> = {
  's-2-5': { syllabus: '0620', tab: 1 },
  'al-3.6': { syllabus: '9701', tab: 2 }
};

// The parts of a topic: the button chosen decides which part is on the page
type TopicPart ='objectives' | 'vocab' | 'concept' | 'example' | 'sim' | 'practice';
const TOPIC_PARTS: { id: TopicPart; en: string; mn: string }[] = [
  { id: 'objectives', en: 'Objectives', mn: 'Зорилго' },
  { id: 'vocab', en: 'Key words', mn: 'Түлхүүр үг' },
  { id: 'concept', en: 'Concepts', mn: 'Тайлбар' },
  { id: 'example', en: 'Worked example', mn: 'Жишээ' },
  { id: 'sim', en: 'Simulation', mn: 'Симуляц' },
  { id: 'practice', en: 'Exam quiz', mn: 'Шалгалтын тест' }
];

// A part of the lesson area with no content for its chapter yet. The part still shows, so every chapter has the same parts.
const PendingPart: React.FC<{ mn: boolean }> = ({ mn }) => (
  <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-sm text-slate-600 dark:text-slate-300">
    {mn ? 'Энэ хэсгийн агуулга удахгүй нэмэгдэнэ.' : 'The content for this part is coming soon.'}
  </div>
);

export const CurriculumView: React.FC = () => {
  const { mode } = useLanguage();
  const { leitnerCards } = useApp();
  // Every part starts folded; the student opens one by pressing its button, and presses it again to fold it
  const [topicPart, setTopicPart] = useState<TopicPart | null>(null);
  // One part of the lesson area at a time: the lesson, its slides or its concept maps
  // A pressed tab opens its part; pressing the same tab again folds the part away
  const [chapterPart, setChapterPart] = useState<'glossary' | 'lesson' | 'slides' | 'map' | 'quick' | null>('lesson');
  const { 
    selectedTopicId, 
    setSelectedTopicId, 
    addMistake, 
    logExamAnswer, 
    markTopicComplete,
    jumpToSimulator,
    jumpToCalculation,
    setActiveTab,
    stats 
  } = useApp();

  // The topic quiz's answers and the time it started, for the topic on show (kept for each topic, see useKeptAnswers below)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [topicQuizDifficulty, setTopicQuizDifficulty] = useState<'All' | 'easy' | 'medium' | 'hard'>('All');
  // Core: content for every candidate. Extended: Core plus Supplement content (grades A*–C).
  const [level, setLevel] = useState<'core' | 'extended'>('extended');
  // Which course the page shows: the programme chosen for the whole app (IGCSE 0620 or AS & A Level 9701)
  const { programme, courseChoice } = useApp();
  // The "I can" ratings of the learning objectives (lib/selfCheck): true = I can, false = not yet, absent = not rated
  const selfCheck = useSelfCheck();
  const checks = selfCheck.lo;
  const [studentName, setStudentName] = useState<string>(readName);
  // When the student last ticked, and when they last saved a report for the teacher
  const [changedAt, setChangedAt] = useState<string | null>(() => readStored(CHANGED_KEY));
  const [exportedAt, setExportedAt] = useState<string | null>(() => readStored(EXPORTED_KEY));

  // Signed-in students: the teacher's copy follows every tick and name change
  const { user: authUser } = useAuthUser();
  // The teacher's account looking at the site as a student: the access it previews ('gated' or 'full'), else null
  const previewAccess = usePreviewAccess(authUser);
  const teacherOnScreen = useTeacherOnScreen(authUser);
  // The student's enrollment in the programme on screen: none, requested, rejected or approved
  const enrollment = useEnrollment(authUser?.uid, courseChoice);
  // A signed-in IGCSE student with a track sees that track's content: Core, or Core with Extended. Teachers and visitors,
  // and students enrolled before the track was asked for, keep the Core / Extended switch.
  const trackLevel = courseChoice === 'igcse' && authUser && enrollment?.track && !isTeacher(authUser) ? enrollment.track : null;
  const contentLevel = trackLevel ?? level;
  // The lesson scores come back from the account after sign-in; the lesson list is drawn again when they arrive
  const [, setProgressVersion] = useState(0);
  useEffect(() => {
    const again = () => setProgressVersion(v => v + 1);
    window.addEventListener(PROGRESS_RESTORED, again);
    return () => window.removeEventListener(PROGRESS_RESTORED, again);
  }, []);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Syllabus chapters the student has opened or folded. Untouched chapters open when they hold the current topic.
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  // The other chapters fold away behind one button; this shows them all again
  const [showAllChapters, setShowAllChapters] = useState(false);
  // The chapter sidebar on a wide screen: open, or folded to a rail that gives the lesson the width. Kept in this browser.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lessonSidebar') !== 'folded';
    } catch {
      return true;
    }
  });
  const setSidebar = (open: boolean) => {
    setSidebarOpen(open);
    try {
      localStorage.setItem('lessonSidebar', open ? 'open' : 'folded');
    } catch {
      /* a private window may refuse storage: the choice then lasts for this visit only */
    }
  };
  // The top of the lesson column, where the page scrolls to when the topic changes
  const lessonRef = useRef<HTMLDivElement>(null);

  // The 9701 schedule dates, and the key terms ticked: the chapter statuses follow both
  const [schedule, setSchedule] = useState<Schedule>(readSchedule);
  const [, refreshMastery] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(MASTERY_EVENT, refreshMastery);
    return () => window.removeEventListener(MASTERY_EVENT, refreshMastery);
  }, []);
  const plan = programme === 'alevel' ? alevelPlan(alevelCourse(courseChoice), schedule, readMastery(), Date.now()) : null;
  const uncovered = programme === 'alevel' ? alevelUncovered(alevelCourse(courseChoice)) : [];

  const changeSchedule = (key: keyof Schedule, value: string) => {
    const next = { ...schedule, [key]: value };
    setSchedule(next);
    writeSchedule(next);
  };

  const playChapter = (chapterId: string) => {
    try {
      window.localStorage.setItem('chem_game_focus', chapterId);
    } catch {
      // Storage can be blocked; the game then opens on all topics
    }
    setActiveTab('games');
  };

  // The status of a chapter: for 9701, its key terms against the schedule; for 0620, how many of its topics are finished
  const chapterState = (ch: { id: string; topics: Topic[] }): { label: string; tone: string; date?: string } | null => {
    const row = plan?.rows[ch.id];
    if (row) {
      const label = { done: mode === 'mn' ? 'Дууссан' : 'Done', late: mode === 'mn' ? 'Хоцорсон' : 'Late', 'on-track': mode === 'mn' ? 'Явцтай' : 'On track' };
      const tone = { done: 'text-emerald-600 dark:text-emerald-400', late: 'text-rose-600 dark:text-rose-400', 'on-track': 'text-slate-500 dark:text-slate-400' };
      return { label: label[row.status], tone: tone[row.status], date: isoDay(new Date(row.planned)) };
    }
    if (programme === 'alevel') return null;
    const finished = ch.topics.filter(t => stats.completedTopics.includes(t.id)).length;
    if (ch.topics.length > 0 && finished === ch.topics.length) {
      return { label: mode === 'mn' ? 'Дууссан' : 'Done', tone: 'text-emerald-600 dark:text-emerald-400' };
    }
    if (finished > 0) return { label: mode === 'mn' ? 'Явагдаж буй' : 'In progress', tone: 'text-slate-600 dark:text-slate-300' };
    return { label: mode === 'mn' ? 'Эхлээгүй' : 'Not started', tone: 'text-slate-500 dark:text-slate-400' };
  };

  // The checklist goes to the teacher whenever a student is signed in: under the name typed here, or else the enrolment name
  useEffect(() => {
    const name = (studentName.trim() || enrollment?.name || authUser?.displayName || '').trim().slice(0, 40) || 'Student';
    if (!authUser || isTeacher(authUser)) return;
    const timer = window.setTimeout(() => {
      saveStudentProgress(authUser.uid, name, checks, stats.completedTopics)
        .then(() => {
          setSavedAt(new Date().toISOString());
          setSaveError(null);
        })
        .catch(() => setSaveError('error'));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [authUser, checks, studentName, stats.completedTopics, enrollment?.name]);

  // When the student last rated an objective, for the report
  useEffect(() => {
    const mark = () => {
      const now = new Date().toISOString();
      writeStored(CHANGED_KEY, now);
      setChangedAt(now);
    };
    window.addEventListener(SELF_CHECK_EVENT, mark);
    return () => window.removeEventListener(SELF_CHECK_EVENT, mark);
  }, []);

  // Download this browser's checklist as a .json file for the teacher to load
  const saveReport = () => {
    writeName(studentName.trim());
    const report = makeReport(studentName, checks, stats.completedTopics);
    const file = `${report.name.replace(/[^\p{L}\p{N}]+/gu, '-')}-0620-checklist.json`;
    writeStored(EXPORTED_KEY, report.date);
    setExportedAt(report.date);
    downloadText(file, JSON.stringify(report, null, 2), 'application/json');
  };

  // The chapters of the programme being shown: the IGCSE 0620 chapters, or the 9701 syllabus sections
  // 9701 shows the chosen level only: AS topics for AS, A Level topics for A Level
  const chapters = programme === 'alevel'
    ? visibleChapters(ALEVEL_CHAPTERS, alevelCourse(courseChoice))
    : CURRICULUM_CHAPTERS;

  // Access: the teacher sees every lesson. A guest and a gated student open the lessons one after another: the first
  // lesson of the course is open, and each next one opens when the one before it is passed. A signed-in student sees a
  // programme's lessons only once the teacher has approved their enrollment in it. Full access opens them all.
  // The teacher's account looking at the site as a student (lib/viewAs) gets that student's access: gated or full.
  const access: 'open' | 'gated' | 'none' | 'pending' = previewAccess
    ? (previewAccess === 'full' ? 'open' : 'gated')
    : authUser && isTeacher(authUser)
    ? 'open'
    : !authUser
      ? 'gated'
      : enrollment === undefined
        ? 'pending'
        : enrollment?.status === 'approved'
          ? (enrollment.access === 'full' ? 'open' : 'gated')
          : 'none';
  const orderedTopics = chapters.flatMap(c => c.topics);
  // The lessons in the order the student goes through them: chapter by chapter; Core students skip the Extended lessons.
  // Each lesson knows where its exit-ticket scores are kept.
  type LessonRef = { id: string; chapterId: string; scores: () => Record<string, number> };
  const seriesOf = programme === 'alevel' ? ALEVEL_LESSON_SERIES : IGCSE_LESSON_SERIES;
  const lessonOrder: LessonRef[] = chapters.flatMap(c => {
    const shown = (l: { tier?: 'core' | 'extended' }) => contentLevel === 'extended' || l.tier !== 'extended';
    if (programme === 'igcse' && c.id === 'ch-states-of-matter') {
      return STATES_LESSONS.filter(shown).map(l => ({ id: l.id, chapterId: c.id, scores: readStatesScores }));
    }
    const series = seriesOf[c.id];
    if (!series) return [];
    return series.lessons.filter(shown).map(l => ({ id: l.id, chapterId: c.id, scores: () => readScores(series.storageKey) }));
  });
  // A lesson opens when it is the first of the course, or when the one before it is passed (above UNLOCK_ABOVE)
  const lessonOpen = (lessonId: string): boolean => {
    if (access === 'open') return true;
    if (access === 'none') return false;
    const i = lessonOrder.findIndex(l => l.id === lessonId);
    if (i < 0) return false;
    if (i === 0) return true;
    const before = lessonOrder[i - 1];
    return (before.scores()[before.id] ?? -1) > UNLOCK_ABOVE;
  };
  // A lesson's slides open once its exit ticket is passed (above UNLOCK_ABOVE). The teacher and full-access students see them
  // all. The rule is the same on IGCSE 0620, AS 9701 and A Level 9701.
  const lessonPassed = (chapterId: string, lessonNumber: number): boolean => {
    if (access === 'open') return true;
    if (chapterId === 'ch-states-of-matter') {
      const lesson = STATES_LESSONS.find(l => l.number === lessonNumber);
      return !!lesson && (readStatesScores()[lesson.id] ?? -1) > UNLOCK_ABOVE;
    }
    const series = seriesOf[chapterId];
    const lesson = series?.lessons.find(l => l.number === lessonNumber);
    return !!series && !!lesson && (readScores(series.storageKey)[lesson.id] ?? -1) > UNLOCK_ABOVE;
  };
  // A topic opens with its chapter's first lesson. A chapter without lessons keeps the rule of finishing the topic before it.
  const isTopicLocked = (topicId: string) => {
    if (access === 'open') return false;
    if (access === 'none') return true;
    const chapterId = orderedTopics.find(t => t.id === topicId)?.chapterId;
    const first = lessonOrder.find(l => l.chapterId === chapterId);
    if (first) return !lessonOpen(first.id);
    const index = orderedTopics.findIndex(t => t.id === topicId);
    return index > 0 && !stats.completedTopics.includes(orderedTopics[index - 1].id);
  };
  // Opening a topic brings the lesson to the top of the screen, so the student never scrolls back up to find it
  const scrollToLesson = () =>
    window.setTimeout(() => lessonRef.current?.scrollIntoView({ block: 'start' }), 0);
  // A lesson's or a topic's concept-map button opens the chapter's concept map at the top of the lesson column
  useEffect(() => {
    const open = () => {
      setChapterPart('map');
      window.setTimeout(() => lessonRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
    };
    window.addEventListener(OPEN_CONCEPT_MAP, open);
    return () => window.removeEventListener(OPEN_CONCEPT_MAP, open);
  }, []);
  const openTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    encourage('read');
    scrollToLesson();
  };
  const selectTopic = (topicId: string) => {
    if (!isTopicLocked(topicId)) openTopic(topicId);
  };

  // Find currently selected topic
  let currentTopic: Topic | undefined;
  for (const ch of chapters) {
    const found = ch.topics.find(t => t.id === selectedTopicId);
    if (found) {
      currentTopic = found;
      break;
    }
  }

  if (!currentTopic) {
    currentTopic = chapters[0].topics[0];
  }
  // A topic that is still locked falls back to the first topic that is open
  if (isTopicLocked(currentTopic.id)) {
    currentTopic = orderedTopics.find(t => !isTopicLocked(t.id)) ?? chapters[0].topics[0];
  }

  // The timed chapter tests sit in the chapter list, after the last chapter of their group. Each opens once its chapters are finished.
  const testRowsAfter = (chapterId: string) =>
    CHAPTER_TESTS.filter(
      t => (programme === 'igcse' ? t.course === 'igcse' : t.course === 'alevel') && t.chapterIds[t.chapterIds.length - 1] === chapterId
    ).map(t => {
      const unlocked = access === 'open' || testUnlocked(t, stats.completedTopics);
      return (
        <div
          key={t.id}
          className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
        >
          {unlocked ? (
            <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-teal-400" aria-hidden />
          ) : (
            <Lock className="w-4 h-4 text-slate-400" aria-hidden />
          )}
          <span className="text-xs font-bold text-slate-900 dark:text-white">{mode === 'mn' ? t.titleMn : t.titleEn}</span>
          <span className="text-[11px] text-slate-600 dark:text-slate-300">
            {mode === 'mn' ? `${t.minutes} мин · ${t.marks} оноо` : `${t.minutes} min · ${t.marks} marks`}
          </span>
          <span className={`text-[11px] font-bold ${unlocked ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
            {unlocked
              ? mode === 'mn' ? 'Нээлттэй' : 'Open'
              : mode === 'mn' ? 'Түгжээтэй: бүлгийн бүх сэдвийг дуусгана уу' : 'Locked until every topic of these chapters is finished'}
          </span>
          <button
            type="button"
            disabled={!unlocked}
            onClick={() => setActiveTab('tests')}
            className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mode === 'mn' ? 'Шалгалт руу' : 'Go to tests'}
          </button>
        </div>
      );
    });

  // The topic's sections (objectives, key words, concepts, example, simulation, exam quiz) open once every 40-minute lesson
  // of the chapter is passed. A chapter without lessons opens them at once.
  const chapterLessons = lessonOrder.filter(l => l.chapterId === currentTopic.chapterId);
  const partsOpen = access === 'open' || chapterLessons.length === 0 || chapterLessons.every(l => (l.scores()[l.id] ?? -1) > UNLOCK_ABOVE);
  // The Objectives and Key words parts are always open: the student rates them during the lessons, and must have rated them
  // before the end-of-topic test and the last exit ticket of the chapter
  const partOpen = (id: TopicPart) => partsOpen || id === 'objectives' || id === 'vocab';
  useEffect(() => {
    if (!partsOpen && topicPart !== 'objectives' && topicPart !== 'vocab') setTopicPart(null);
  }, [partsOpen]);
  // When the last lesson of a chapter is passed, the student moves on to the first topic of the next chapter
  const openNextChapter = () => {
    const at = chapters.findIndex(c => c.id === currentTopic?.chapterId);
    const next = chapters[at + 1]?.topics[0];
    if (next) openTopic(next.id);
  };

  const isChapterOpen = (chId: string, topics: Topic[]) =>
    chId in openChapters ? openChapters[chId] : topics.some(t => t.id === currentTopic?.id);

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-GB';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // The topic quiz has 30 minutes, counted from the first answer. When the time is up, no more answers are taken until the
  // student starts again. Each topic has its own answers and its own time, kept on this device and on the student's account.
  const QUIZ_MS = 30 * 60 * 1000;
  useKeptAnswers(`topic_quiz_${currentTopic.id}`, { picked: selectedAnswers, startedAt: quizStartedAt }, saved => {
    setSelectedAnswers(saved.picked ?? {});
    setQuizStartedAt(saved.startedAt ?? null);
  });
  const quizEndsAt = quizStartedAt === null ? null : quizStartedAt + QUIZ_MS;
  const [clock, setClock] = useState<number>(() => Date.now());
  useEffect(() => {
    if (quizEndsAt === null) return;
    setClock(Date.now());
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [quizEndsAt]);
  const quizLeft = quizEndsAt === null ? null : Math.max(0, Math.ceil((quizEndsAt - clock) / 1000));
  const quizOver = quizLeft === 0;
  const startQuizClock = () => {
    if (quizStartedAt !== null) return;
    const start = Date.now();
    setClock(start);
    setQuizStartedAt(start);
  };

  const handleSelectOption = (q: ExamQuestion, optionId: 'A' | 'B' | 'C' | 'D') => {
    if (quizOver) return;
    startQuizClock();
    setSelectedAnswers(prev => ({ ...prev, [q.id]: optionId }));

    const isCorrect = optionId === q.correctOption;
    logExamAnswer(q, isCorrect ? 1 : 0);
    encourage(isCorrect ? 'correct' : 'wrong');

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

  // The topic's quiz: every multiple-choice question first, then its structured ones, filtered by the difficulty tabs
  const quizQuestions = useMemo(
    () => [...topicQuizMcq(currentTopic), ...topicStructured(currentTopic)],
    [currentTopic]
  );
  const visibleQuizQuestions = quizQuestions.filter(q => {
    if (topicQuizDifficulty === 'All') return true;
    return quizLevel(q) === topicQuizDifficulty;
  });

  // A structured answer counts as submitted once the learner sends it; that is kept on this device
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({});
  const isSubmitted = (qId: string): boolean => submittedAnswers[qId] ?? readFlag(`chem_submitted_${qId}`);
  const submitStructured = (qId: string) => {
    if (quizOver) return;
    startQuizClock();
    writeFlag(`chem_submitted_${qId}`);
    setSubmittedAnswers(prev => ({ ...prev, [qId]: true }));
  };

  const toggleStructuredReveal = (qId: string) => {
    setRevealedSolutions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Starts the topic quiz again: its answers are cleared and the 30 minutes start with the next answer. The written answers
  // stay in their boxes, but each has to be submitted again before its mark scheme opens.
  const quizStarted = quizStartedAt !== null || Object.keys(selectedAnswers).length > 0;
  const restartQuiz = () => {
    setSelectedAnswers({});
    setQuizStartedAt(null);
    const structured = quizQuestions.filter(q => q.type !== 'mcq').map(q => q.id);
    structured.forEach(id => keepValue(`chem_submitted_${id}`, ''));
    setSubmittedAnswers(prev => ({ ...prev, ...Object.fromEntries(structured.map(id => [id, false])) }));
    setRevealedSolutions(prev => ({ ...prev, ...Object.fromEntries(structured.map(id => [id, false])) }));
  };

  const isCompleted = stats.completedTopics.includes(currentTopic.id);

  // Every worked example for this topic: the original one, then the ones from the revision deck
  const examples = [currentTopic.workedExample, ...(currentTopic.workedExamples ?? [])].filter(
    (e): e is WorkedExample => !!e
  );

  const visibleObjectives = currentTopic.learningObjectives.filter(lo => contentLevel === 'extended' || lo.tier !== 'extended');
  const doneCount = visibleObjectives.filter(lo => checks[lo.id]).length;

  // The lab for this topic. The lesson links to it; the lab itself lives only in the Virtual Labs tab.
  const recommendedLab = currentTopic.recommendedSimulator;

  // One link to this topic's virtual lab, or to the Virtual Labs tab when the topic has no lab of its own
  const virtualLabLink = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
          {mode === 'mn' ? 'Хичээлийн интерактив симуляц' : 'Integrated Virtual Simulation'}
        </h3>
      </div>
      <button
        onClick={() => (recommendedLab ? jumpToSimulator(recommendedLab) : setActiveTab('labs'))}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-sm transition-colors"
      >
        <FlaskConical className="w-4 h-4" />
        <span>
          {recommendedLab
            ? (mode === 'mn' ? 'Виртуал лаб нээх' : 'Launch Virtual Lab')
            : (mode === 'mn' ? 'Виртуал лабораториуд' : 'Virtual Labs')}
        </span>
      </button>
    </div>
  );


  // The concept maps above the lesson: the chapter (its topics), then this topic (its sections, or its learning objectives on 9701)
  const shown = currentTopic;

  // Only the chapter of the topic on show is open in the syllabus list; moving to a topic in another chapter opens that one
  useEffect(() => {
    if (currentTopic) setOpenChapters({ [currentTopic.chapterId]: true });
  }, [currentTopic?.chapterId]);
  const chapter = chapters.find(ch => ch.topics.some(t => t.id === shown.id)) ?? chapters[0];
  const visibleSections = shown.sections.filter(sec => contentLevel === 'extended' || sec.tier !== 'extended');
  const chapterBranches: ConceptBranch[] = chapter.topics.map(t => ({
    id: t.id,
    title: mode === 'mn' ? t.titleMn : t.titleEn,
    ref: t.syllabusRef,
    lines: t.vocabulary.length
      ? t.vocabulary.slice(0, 4).map(v => (mode === 'mn' ? v.termMn : v.termEn))
      : [mode === 'mn' ? `${t.learningObjectives.length} зорилт` : `${t.learningObjectives.length} objectives`],
    onClick: () => selectTopic(t.id)
  }));
  const topicBranches: ConceptBranch[] =
    visibleSections.length > 0
      ? visibleSections.map(sec => {
          const rule = mode === 'mn' ? sec.keyRuleMn : sec.keyRuleEn;
          return { id: sec.id, title: mode === 'mn' ? sec.titleMn : sec.titleEn, lines: rule ? [rule] : [] };
        })
      : visibleObjectives.map(lo => ({ id: lo.id, title: mode === 'mn' ? lo.mn : lo.en, lines: [] }));
  const topicTerms = shown.vocabulary.map(v => (mode === 'mn' ? v.termMn : v.termEn));
  // The topic after this one, in syllabus order: the end-of-topic test opens it above 60%
  const allTopics = chapters.flatMap(c => c.topics);
  const shownIndex = allTopics.findIndex(t => t.id === shown.id);
  const nextTopic = allTopics[shownIndex + 1];
  const prevTopic = shownIndex > 0 ? allTopics[shownIndex - 1] : undefined;
  const nextLocked = !!nextTopic && isTopicLocked(nextTopic.id);

  // The programme switch: IGCSE 0620 lessons or the AS & A Level 9701 revision
  const programmeSwitch = <CourseSwitch />;

  // Whether the chapter has its lesson written yet. Every chapter shows the same parts, so a chapter without one shows a note.
  const lessonReady = (programme === 'igcse' && currentTopic.chapterId === 'ch-states-of-matter')
    || (programme === 'alevel' && (!!ALEVEL_LESSON_SERIES[currentTopic.chapterId] || !!ALEVEL_INQUIRY[currentTopic.chapterId]))
    || (programme === 'igcse' && !!IGCSE_LESSON_SERIES[currentTopic.chapterId]);
  // The chapter's quick check. 0620 chapter 1 has one set per lesson, the same sets as the quick checks in the lesson steps, so
  // their answers are shared. Every other chapter has one set of five questions taken in turn from all its topics.
  const isStatesChapter = programme === 'igcse' && currentTopic.chapterId === 'ch-states-of-matter';
  const chapterInfo = chapters.find(c => c.id === currentTopic.chapterId);
  const chapterName = { en: chapterInfo?.titleEn ?? '', mn: chapterInfo?.titleMn ?? '' };
  const mcqQuick: QuizItem[] = isStatesChapter ? [] : (() => {
    if (!chapterInfo || chapterInfo.topics.length === 0) return [];
    return chapterQuickMcq(chapterInfo.topics).map(q => {
      const answer = Math.max(0, q.options?.findIndex(o => o.id === q.correctOption) ?? 0);
      return {
        question: { en: q.questionTextEn, mn: q.questionTextMn },
        options: (q.options ?? []).map(o => ({ en: o.textEn, mn: o.textMn })),
        answer,
        explanation: {
          en: `Correct answer: ${q.correctOption}. ${q.misconceptionDiagnosisEn}`,
          mn: `Зөв хариулт: ${q.correctOption}. ${q.misconceptionDiagnosisMn}`
        }
      };
    });
  })();
  const quickSets: { key: string; name: { en: string; mn: string }; items: QuizItem[] }[] = (isStatesChapter
    ? STATES_LESSONS.map(l => ({ key: `chem_quick_${l.id}`, name: l.title, items: QUICK_CHECKS[l.id] ?? [] }))
    // _mix: the set now takes its questions from all the chapter's topics, so answers kept for the older set are not shown on it
    : [{ key: `chem_quick_mix_${currentTopic.chapterId}`, name: chapterName, items: mcqQuick }]
  ).filter(s => s.items.length > 0);
  const hasQuick = quickSets.length > 0;
  // In the lesson column the quick check is one column; on its own tab it fills the page in two columns on a wide screen
  const quickBody = (wide: boolean) => quickSets.map(s => (
    <div key={s.key} className="space-y-3">
      {isStatesChapter && <div className="text-sm font-bold text-slate-900 dark:text-white">{mode === 'mn' ? s.name.mn : s.name.en}</div>}
      <QuickCheck items={s.items} mn={mode === 'mn'} storageKey={s.key} resultLabel={s.name} wide={wide} />
    </div>
  ));

  // The chapter's key words: the 9701 glossary, or the key words of the 0620 topics of the chapter
  const chapterGlossary: GlossaryTerm[] = programme === 'alevel'
    ? (ALEVEL_GLOSSARY[currentTopic.chapterId] ?? [])
    : (chapters.find(c => c.id === currentTopic.chapterId)?.topics ?? []).flatMap(t =>
        t.vocabulary.map(v => ({ term: { en: v.termEn, mn: v.termMn }, def: { en: v.definitionEn, mn: v.definitionMn } }))
      );
  // The same parts, in the same order, for every chapter of both courses: lesson, key words, concept maps, slides, quick check
  const lessonParts = [
    { id: 'lesson' as const, en: 'Lesson', mn: 'Хичээл' },
    { id: 'glossary' as const, en: 'Key words', mn: 'Түлхүүр үгийн сан' },
    { id: 'map' as const, en: 'Concept maps', mn: 'Концепт зураг' },
    { id: 'slides' as const, en: 'Slides', mn: 'Слайд' },
    { id: 'quick' as const, en: 'Quick check', mn: 'Quick check' }
  ];
  const activePart = chapterPart;
  // The time with this chapter open is counted for the teacher; only an enrolled student's time is counted (the hook runs before the checks below)
  useStudyTime({
    course: courseChoice,
    chapterId: currentTopic.chapterId,
    lessonId: null,
    enabled: access === 'open' || access === 'gated'
  });

  // Until the enrollment is known, the lessons stay hidden, so an approved student is not shown the request card first
  if (access === 'pending') return null;
  // A signed-in student with no approved enrollment in this programme sees the request card instead of the lessons
  if (access === 'none') {
    const course = COURSE_CHOICES.find(c => c.id === courseChoice);
    return (
      <div className="grid grid-cols-1 gap-6 pb-20">
        <div className="lg:col-span-12">{programmeSwitch}</div>
        <div className="lg:col-span-12 max-w-2xl">
          <EnrollmentGate
            mn={mode === 'mn'}
            programmeLabel={course?.labelEn ?? ''}
            status={enrollment?.status ?? null}
            defaultName={authUser?.displayName ?? ''}
            onRequest={(name, grade) => (authUser
              ? requestEnrollment(authUser.uid, courseChoice, name, grade)
              : Promise.resolve())}
          />
        </div>
      </div>
    );
  }

  // The chapter 1 lesson uses the full width of the page: the chapter list sits above it
  // The chapter's lesson shows on its own tab and under its slides
  const showLesson = activePart === 'lesson' || activePart === 'slides';
  // Every chapter, chapter 1 included, has the same layout: the chapter list on the left, the lesson on the right

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
      {/* Sidebar: Curriculum Tree & Chapter Navigation (3 of 12 cols, a quarter of the width) */}
      {/* On a wide screen the sidebar stays in view beside the lesson and fills the screen down to 12px from the bottom.
          Its top (account, syllabus heading) and its bottom (progress, at the foot) stay put, and only the chapter list in
          the middle scrolls. It starts level with the lesson beside it (187px, below the 149px navbar), so it fits the
          screen both at the top of the page and once the page is scrolled. */}
      <div className={`${sidebarOpen ? 'lg:col-span-3' : 'lg:col-span-1'} lg:sticky lg:top-[85px] lg:self-start lg:h-[calc(100vh-85px-12px)] flex min-h-0 flex-col gap-4 lg:gap-2`}>
        {/* Folded (wide screens): a rail with one button that opens the chapter sidebar again */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebar(true)}
            aria-label={mode === 'mn' ? 'Хичээлийн жагсаалтыг нээх' : 'Open the lesson list'}
            title={mode === 'mn' ? 'Хичээлийн жагсаалтыг нээх' : 'Open the lesson list'}
            className="hidden lg:flex flex-1 min-h-0 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-wider [writing-mode:vertical-rl]">{mode === 'mn' ? 'Хичээлүүд' : 'Lessons'}</span>
          </button>
        )}
        {/* The sidebar itself. Folded on wide screens it is hidden; on phones it always shows. */}
        <div className={`${!sidebarOpen ? 'lg:hidden' : ''} flex min-h-0 flex-1 flex-col gap-4 lg:gap-2`}>
        <div className="lg:hidden">
          <StudentAccount user={authUser} hasName={!!studentName.trim()} savedAt={savedAt} saveError={saveError} dense />
        </div>
        {/* On a wide screen the progress card sits at the foot of the sidebar, under the chapter list */}
        <div className="lg:order-last">
          <StudentProgressCard level={contentLevel} dense />
        </div>
        {/* The syllabus card takes the rest of the column. On a wide screen only its chapter list scrolls (see below). */}
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-2.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 lg:pb-1.5 lg:mb-1.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
              <h2 className="text-sm lg:text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {programme === 'alevel'
                  ? (mode === 'mn'
                    ? (courseChoice === 'as' ? 'AS Level 9701 хөтөлбөр' : 'A Level 9701 хөтөлбөр')
                    : (courseChoice === 'as' ? 'Syllabus 9701 (AS Level)' : 'Syllabus 9701 (A Level)'))
                  : (mode === 'mn' ? 'Кэмбрижийн Хөтөлбөр' : 'Cambridge 0620 Syllabus')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono text-slate-500">
                {stats.completedTopics.length} / {chapters.flatMap(c => c.topics).length} {mode === 'mn' ? 'хичээл' : 'done'}
              </span>
              <button
                type="button"
                onClick={() => setSidebar(false)}
                aria-label={mode === 'mn' ? 'Жагсаалтыг хураах' : 'Fold the lesson list'}
                title={mode === 'mn' ? 'Жагсаалтыг хураах' : 'Fold the lesson list'}
                className="hidden lg:inline-flex p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>

          {/* The 9701 schedule: the dates, and how far the key terms are against the schedule */}
          {plan && (
            <div className="mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span>{mode === 'mn' ? 'Хуваарь' : 'Schedule'}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={schedule.start}
                    onChange={e => changeSchedule('start', e.target.value)}
                    aria-label={mode === 'mn' ? 'Эхлэх' : 'Start'}
                    className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                  />
                  <span>→</span>
                  <input
                    type="date"
                    value={schedule.end}
                    onChange={e => changeSchedule('end', e.target.value)}
                    aria-label={mode === 'mn' ? 'Дуусах' : 'End'}
                    className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                  />
                </div>
              </div>
              {!plan.valid && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  {mode === 'mn' ? 'Дуусах огноо эхлэх огнооноос хойш байх ёстой.' : 'The end date must be after the start date.'}
                </p>
              )}
              <div className="relative h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: `${plan.actualPct}%` }} />
                <div className="absolute -top-1 h-4 w-0.5 bg-slate-900 dark:bg-white" style={{ left: `${plan.expectedPct}%` }} />
              </div>
              <div className="flex justify-between gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                <span>
                  {mode === 'mn' ? 'Одоо' : 'Now'}: {plan.actualPct}% · {plan.totalDone} / {plan.totalTerms}
                </span>
                <span>
                  {mode === 'mn' ? 'Хуваарийн дагуу' : 'By schedule'}: ~{plan.expectedPct}%
                </span>
              </div>
            </div>
          )}

          {/* Chapters and Sub-Topics List */}
          {chapters.length > 1 && (
            <button
              onClick={() => setShowAllChapters(show => !show)}
              aria-expanded={showAllChapters}
              className="w-full mb-3 lg:mb-1.5 px-3 py-2 lg:py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {showAllChapters
                ? mode === 'mn' ? 'Бусад бүлгүүдийг хураах' : 'Fold the other chapters'
                : mode === 'mn' ? `Бусад бүлгүүд (${chapters.length - 1})` : `Other chapters (${chapters.length - 1})`}
            </button>
          )}
          {/* The chapter list: on a wide screen it is the part that scrolls, between the heading above and the topics below */}
          <div className="space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            {chapters.map(ch => {
              const open = isChapterOpen(ch.id, ch.topics);
              // Only the chapter on show and the chapters the student opened are listed; the rest fold away
              if (!showAllChapters && !open && ch.id !== currentTopic?.chapterId) return null;
              const finishedTopics = ch.topics.filter(t => stats.completedTopics.includes(t.id)).length;
              const topicPct = ch.topics.length ? Math.round((finishedTopics / ch.topics.length) * 100) : 0;
              const state = chapterState(ch);
              // A 0620 chapter always has its key words to play; a 9701 chapter has them when it has key terms
              const playable = programme === 'igcse' || !!plan?.rows[ch.id];
              // The learning outcomes of the topic on show, when that topic is in this chapter, at the level being viewed
              const shownTopic = ch.topics.find(t => t.id === currentTopic?.id);
              const objectives = shownTopic
                ? shownTopic.learningObjectives.filter(lo => contentLevel === 'extended' || lo.tier !== 'extended')
                : [];
              return (
              <React.Fragment key={ch.id}>
              <div className="py-2.5 lg:py-2 border-b border-slate-200 dark:border-slate-800 last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex-1 min-w-[10rem] space-y-1">
                    <div className="text-sm lg:text-xs font-bold text-slate-900 dark:text-white">
                      {ch.number}. {mode === 'mn' ? ch.titleMn : ch.titleEn}
                      {programme === 'alevel' && <LevelBadge level={chapterLevel(ch.id)} />}
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${topicPct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    {finishedTopics} / {ch.topics.length}
                  </span>
                  {state && (
                    <span className={`text-xs font-bold ${state.tone}`}>
                      {state.label}
                      {state.date ? ` · ${state.date}` : ''}
                    </span>
                  )}
                  <button
                    onClick={() => setOpenChapters(Object.fromEntries(chapters.map(c => [c.id, c.id === ch.id ? !open : false])))}
                    aria-expanded={open}
                    className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {open ? (mode === 'mn' ? 'Хаах' : 'Close') : mode === 'mn' ? 'Дэлгэрэнгүй' : 'Details'}
                  </button>
                </div>

                {open && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {ch.topics.map(t => {
                        const isSelected = t.id === currentTopic?.id;
                        const isDone = stats.completedTopics.includes(t.id);
                        const locked = isTopicLocked(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => selectTopic(t.id)}
                            disabled={locked}
                            aria-pressed={isSelected}
                            className={`px-2 py-0.5 rounded-md text-[12px] border transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                                : isDone
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
                                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isDone && !isSelected ? '✓ ' : ''}
                            {t.number} {mode === 'mn' ? t.titleMn : t.titleEn}
                          </button>
                        );
                      })}
                    </div>
                    {playable && (
                      <button
                        onClick={() => playChapter(ch.id)}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-black"
                      >
                        {mode === 'mn' ? 'Энэ бүлгийн үгсийг тоглох →' : "Play this chapter's words →"}
                      </button>
                    )}
                    {objectives.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {mode === 'mn' ? 'Суралцах зорилт' : 'Learning outcomes'} · {shownTopic?.number} · {objectives.filter(lo => checks[lo.id]).length} / {objectives.length}
                        </div>
                        <ul className="max-h-64 lg:max-h-none overflow-y-auto lg:overflow-visible space-y-1 pr-1">
                          {objectives.map(lo => (
                            <li key={lo.id} className="flex gap-2 text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
                              <span className={`shrink-0 font-mono font-bold ${checks[lo.id] ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {lo.code}
                              </span>
                              <span>{mode === 'mn' ? lo.mn : lo.en}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {testRowsAfter(ch.id)}
              </React.Fragment>
              );
            })}
          </div>
          {/* Syllabus topics of the 9701 level that have no lesson in the app yet */}
          {uncovered.length > 0 && (
            <div className="mt-4 lg:mt-2 pt-3 lg:pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 lg:shrink-0 lg:max-h-40 lg:overflow-y-auto">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {mode === 'mn' ? 'Syllabus-ийн сэдэв, хичээл хараахан байхгүй' : 'Syllabus topics with no lesson in the app yet'}
              </div>
              <ul className="space-y-1">
                {uncovered.map(t => (
                  <li key={t.number} className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-2">
                    <span className="font-mono">{t.number}.</span>
                    <span>{mode === 'mn' ? t.titleMn : t.titleEn}</span>
                    <LevelBadge level={t.level} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Main Column: 7-Step Interactive Lesson Scaffold (9 of 12 cols) */}
      <div ref={lessonRef} className={`${sidebarOpen ? 'lg:col-span-9' : 'lg:col-span-11'} space-y-6 scroll-mt-32 xl:scroll-mt-20`}>
        {/* The lesson area: one part at a time (the lesson, its slides or its concept maps) */}
        {/* The part tabs stay in view while the lesson scrolls; they sit in a light toolbar card, so no white band crosses the page */}
        <div className="flex flex-wrap items-center gap-3 lg:sticky lg:top-[77px] lg:z-20 lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white/90 lg:px-2 lg:py-1.5 lg:shadow-sm lg:backdrop-blur">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={mode === 'mn' ? 'Сэдвийн агуулга' : 'Topic content'}>
          {lessonParts.map(p => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={activePart === p.id}
              onClick={() => setChapterPart(activePart === p.id ? null : p.id)}
              className={`px-3.5 lg:px-2.5 py-2 lg:py-1.5 rounded-lg text-sm font-bold transition-colors ${
                activePart === p.id
                  ? COURSE_SOLID[courseChoice]
                  : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-500'
              }`}
            >
              {mode === 'mn' ? p.mn : p.en}
            </button>
          ))}
        </div>
        {/* On wide screens the account sits at the right end of this row, out of the sidebar */}
        <div className="hidden lg:block lg:ml-auto lg:w-[18rem] lg:shrink-0">
          <StudentAccount user={authUser} hasName={!!studentName.trim()} savedAt={savedAt} saveError={saveError} dense />
        </div>
        </div>
        {/* Every part of the lesson page (the lesson, key words, concept maps, slides with the whiteboard, quick check and the
            topic's own sections) fills the column beside the chapter list, so each page of studying looks the same */}
        <div className="space-y-6">
        {/* The quick check sits along the lesson steps, under the lesson; its answers show here too once they are given */}
        {activePart === 'lesson' && hasQuick && !isStatesChapter && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Quick check</div>
            {quickBody(false)}
          </div>
        )}
        {activePart === 'quick' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Quick check</div>
            {hasQuick ? quickBody(true) : <PendingPart mn={mode === 'mn'} />}
          </div>
        )}
        {activePart === 'glossary' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              {mode === 'mn' ? 'Түлхүүр үгийн сан' : 'Key words glossary'}
            </div>
            {chapterGlossary.length > 0
              ? <StatesGlossary key={currentTopic.chapterId} items={chapterGlossary} mn={mode === 'mn'} />
              : <PendingPart mn={mode === 'mn'} />}
          </div>
        )}
        {/* Chapter 1 (IGCSE) has the states concept map, the same as the other chapters' concept maps */}
        {activePart === 'map' && programme === 'igcse' && currentTopic.chapterId === 'ch-states-of-matter' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
            <StatesConceptMap mn={mode === 'mn'} onOpenTopic={setSelectedTopicId} />
          </div>
        )}
        {/* Concept maps above the lesson: the chapter's, then the topic's */}
        {activePart === 'map' && !(programme === 'igcse' && currentTopic.chapterId === 'ch-states-of-matter') && CONCEPT_MAPS[chapter.id] && (
          <ChapterConceptMap
            map={CONCEPT_MAPS[chapter.id]}
            topics={chapter.topics}
            currentTopicId={shown.id}
            mn={mode === 'mn'}
            onOpenTopic={selectTopic}
          />
        )}
        {/* A chapter whose map is not written yet: the maps built from its topics */}
        {activePart === 'map' && !(programme === 'igcse' && currentTopic.chapterId === 'ch-states-of-matter') && !CONCEPT_MAPS[chapter.id] && (
          <>
            <ConceptMap
              label={mode === 'mn' ? 'Бүлгийн концепт зураг' : 'Chapter concept map'}
              centre={mode === 'mn' ? chapter.titleMn : chapter.titleEn}
              centreRef={`${mode === 'mn' ? 'Бүлэг' : 'Chapter'} ${chapter.number}`}
              branches={chapterBranches}
              terms={[]}
              mn={mode === 'mn'}
            />
            <ConceptMap
              label={mode === 'mn' ? 'Сэдвийн концепт зураг' : 'Topic concept map'}
              centre={mode === 'mn' ? shown.titleMn : shown.titleEn}
              centreRef={shown.syllabusRef}
              branches={topicBranches}
              terms={topicTerms}
              mn={mode === 'mn'}
            />
          </>
        )}
        {activePart === 'slides' && !CHAPTER_SLIDES[currentTopic.chapterId] && <PendingPart mn={mode === 'mn'} />}
        {/* The slides come first; the chapter's lesson sits under them, so the child reads it while studying the slides */}
        {activePart === 'slides' && (
          <ChapterSlides
            chapterId={currentTopic.chapterId}
            mn={mode === 'mn'}
            unlocked={!!authUser && (access === 'open' || access === 'gated')}
            lessonPassed={n => lessonPassed(currentTopic.chapterId, n)}
            printApproved={!!authUser && (teacherOnScreen || (enrollment?.printChapters ?? []).includes(currentTopic.chapterId))}
          />
        )}
        {/* The free simulations and the virtual lab for this topic, under the slides */}
        {activePart === 'slides' && (
          <div className="space-y-5">
            <LessonVisuals topicId={currentTopic.id} showVisual={false} />
            {virtualLabLink}
          </div>
        )}
        {/* Chapter 1 (IGCSE): the four interactive 40-minute lessons, built from its learning outcomes */}
        {showLesson && programme === 'igcse' && currentTopic.chapterId === 'ch-states-of-matter' && (
          <InteractiveChapterOne mn={mode === 'mn'} onOpenTopic={setSelectedTopicId} isOpen={lessonOpen} onNext={openNextChapter} allOpen={access === 'open'} level={contentLevel} />
        )}
        {showLesson && programme === 'alevel' && ALEVEL_LESSON_SERIES[currentTopic.chapterId] && (
          <LessonSeries
            key={`series-${currentTopic.chapterId}`}
            data={ALEVEL_LESSON_SERIES[currentTopic.chapterId]}
            mn={mode === 'mn'}
            isOpen={lessonOpen}
            onNext={openNextChapter}
            allOpen={access === 'open'}
          />
        )}
        {showLesson && programme === 'igcse' && IGCSE_LESSON_SERIES[currentTopic.chapterId] && (
          <LessonSeries
            key={`series-${currentTopic.chapterId}-${contentLevel}`}
            data={IGCSE_LESSON_SERIES[currentTopic.chapterId]}
            mn={mode === 'mn'}
            level={contentLevel}
            isOpen={lessonOpen}
            onNext={openNextChapter}
            allOpen={access === 'open'}
          />
        )}
        {showLesson && programme === 'alevel' && ALEVEL_INQUIRY[currentTopic.chapterId] && (
          <AlevelInquiryLesson
            key={currentTopic.chapterId}
            chapterId={currentTopic.chapterId}
            plan={ALEVEL_INQUIRY[currentTopic.chapterId]}
            chapterTitle={{ mn: chapters.find(c => c.id === currentTopic.chapterId)?.titleMn ?? '', en: chapters.find(c => c.id === currentTopic.chapterId)?.titleEn ?? '' }}
            mn={mode === 'mn'}
            allOpen={access === 'open'}
          />
        )}
        {activePart === 'lesson' && !lessonReady && <PendingPart mn={mode === 'mn'} />}
        {/* Topic Header & Completion Action */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-teal-400 font-bold uppercase tracking-wider">
                <span>{currentTopic.syllabusRef}</span>
                <span>·</span>
                <span>Topic {currentTopic.number}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                <ChemText>{mode === 'mn' ? currentTopic.titleMn : currentTopic.titleEn}</ChemText>
              </h1>
            </div>

            <button
              onClick={() => markTopicComplete(currentTopic.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-base font-black transition-all shadow-sm ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleted ? (mode === 'mn' ? 'Судалсан ✔' : 'Completed ✔') : (mode === 'mn' ? 'Судалснаар тэмдэглэх' : 'Mark as Completed')}</span>
            </button>
          </div>
          {/* The coursebook comes first: the student reads these pages, then uses the lesson to check and practise */}
          {COURSEBOOK[currentTopic.chapterId] && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-slate-800 dark:text-slate-200 space-y-1">
              <div className="font-bold">{mode === 'mn' ? 'Сурах бичиг: эхлээд унш' : 'Coursebook: read this first'}</div>
              <div>
                {COURSEBOOK[currentTopic.chapterId].books}
                {COURSEBOOK[currentTopic.chapterId].pages
                  ? ` · ${mode === 'mn' ? 'хуудас' : 'pages'} ${COURSEBOOK[currentTopic.chapterId].pages}`
                  : ''}
                {COURSEBOOK[currentTopic.chapterId].questions ? ` · ${COURSEBOOK[currentTopic.chapterId].questions}` : ''}
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                {mode === 'mn'
                  ? 'Дараа нь доорх хичээлээр ойлголтоо шалгаж, дасгалаа хий.'
                  : 'Then check your understanding with the lesson below, and practise.'}
              </div>
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <ChemText>{mode === 'mn' ? currentTopic.summaryMn : currentTopic.summaryEn}</ChemText>
          </p>

          {/* The topic is shown one part at a time: the button chosen decides which part is on the page */}
          <div className="flex flex-wrap gap-1.5 pt-4">
            {/* Chapter 1's simulations sit under its slides and concepts, so topic 1.1 has no Simulation part */}
            {TOPIC_PARTS.filter(p => p.id !== 'sim' || currentTopic.id !== 'top-1-1').map(p => (
              <button
                key={p.id}
                onClick={() => partOpen(p.id) && setTopicPart(topicPart === p.id ? null : p.id)}
                disabled={!partOpen(p.id)}
                aria-pressed={topicPart === p.id}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  topicPart === p.id
                    ? `${COURSE_SOLID[courseChoice]} border-transparent`
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-500'
                }`}
              >
                {mode === 'mn' ? p.mn : p.en}
              </button>
            ))}
          </div>
          {!partsOpen && (
            <p className="text-xs text-slate-600 dark:text-slate-400 pt-2">
              {mode === 'mn'
                ? '«Зорилго», «Түлхүүр үг» үргэлж нээлттэй. Бусад хэсэг энэ бүлгийн хичээлүүдийг дуусгасны дараа нээгдэнэ.'
                : 'Objectives and Key words are always open. The other sections open once you finish this chapter’s lessons.'}
            </p>
          )}

          <div className={topicPart === 'objectives' ? '' : 'hidden'}>
          {/* Step 1: Learning Objectives Checklist */}
          <div className="mt-5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block font-mono">
                {mode === 'mn' ? 'Кэмбрижийн суралцахуйн зорилтууд:' : 'Cambridge Learning Objectives:'}
              </span>
              {!trackLevel && (
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                {(['core', 'extended'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    title={l === 'core' ? 'Core content for all candidates' : 'Core plus Extended (Supplement) content'}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      level === l
                        ? l === 'core' ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {l === 'core' ? 'Core' : 'Extended'}
                  </button>
                ))}
              </div>
              )}
            </div>
            {/* "I can" self-check: every statement is rated I can or not yet; the end-of-topic test waits for it */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {mode === 'mn'
                ? 'Зорилт бүрийг «Чадна» эсвэл «Хараахан» гэж үнэлнэ. Бүгдийг үнэлсний дараа сэдвийн шалгалт нээгдэнэ. Үнэлгээг багш харна.'
                : 'Rate every statement: I can, or not yet. The end-of-topic test opens once all are rated. Your teacher sees the ratings.'}
            </p>
            <SelfCheckList topic={currentTopic} mn={mode === 'mn'} level={contentLevel} show="objectives" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs">
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                maxLength={40}
                placeholder={mode === 'mn' ? 'Таны нэр' : 'Your name'}
                className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
              />
              <button
                onClick={saveReport}
                disabled={!studentName.trim()}
                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{mode === 'mn' ? 'Багшдаа тайлан хадгалах' : 'Save report for teacher'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {mode === 'mn'
                ? 'Тайлан .json файл болж татагдана. Багш тэр файлыг өөрийн хэсэгт ачаална.'
                : 'The report downloads as a .json file. Your teacher loads it in their portal.'}
            </p>
          </div>
          </div>
        </div>

        <div className={topicPart === 'vocab' ? '' : 'hidden'}>
        {/* Step 2: Key Vocabulary Flashcards */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {mode === 'mn' ? 'Түлхүүр үгс ба тодорхойлолт' : 'Key Vocabulary & Scientific Terminology'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {currentTopic.vocabulary.length} terms
            </span>
          </div>

          {/* Every key word is rated I can or not yet; the end-of-topic test waits for it (a 9701 topic: its chapter's terms) */}
          <SelfCheckList topic={currentTopic} mn={mode === 'mn'} level={contentLevel} show="words" />

          <KeyWordList terms={currentTopic.vocabulary} mn={mode === 'mn'} mode={mode} speakWord={speakWord} />
        </div>

        </div>

        <div className={topicPart === 'sim' ? '' : 'hidden'}>
        {/* AS 9701 chapter 6 (Electrochemistry): the electron-flow electrolysis page, above the topic's visuals */}
        {currentTopic.chapterId === 'al-ch-6' && (
          <div className="mb-6 space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              {mode === 'mn' ? 'Электролиз: электроны урсах зам' : 'Electrolysis: electron flow'}
            </div>
            <ElectronFlowLab mn={mode === 'mn'} />
          </div>
        )}
        {/* AS 9701 topic 4.1 The gaseous state: the particle model with pV = nRT and real gases (not 4.2 Bonding and structure) */}
        {currentTopic.id === 'al-4.1' && (
          <div className="mb-6 space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
              {mode === 'mn' ? 'Бөөмсийн загвар ба хийн төлөв (pV = nRT)' : 'Particle model and the gaseous state (pV = nRT)'}
            </div>
            <ParticleModelLab mn={mode === 'mn'} course="as" />
          </div>
        )}
        {/* IGCSE 0620 chapter 1 (States of matter): the teacher's particle-model lab */}
        {programme === 'igcse' && currentTopic.chapterId === 'ch-states-of-matter' && (
          <div className="mb-6 space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">
              {mode === 'mn' ? 'Бөөмсийн загвар: хатуу, шингэн, хий · тархалт · хийн даралт' : 'Particle model: solid, liquid, gas · diffusion · gas pressure'}
            </div>
            <ParticleModelLab mn={mode === 'mn'} course="igcse" />
          </div>
        )}
        {/* IGCSE 0620 topics 2.2 Atomic structure and the Periodic Table and 2.3 Isotopes: the teacher's atomic-structure lab,
            opened at building an atom (2.2) or at isotopes (2.3), so the questions on submitting match the part shown */}
        {programme === 'igcse' && (currentTopic.id === 's-2-2' || currentTopic.id === 's-2-3') && (
          <div className="mb-6">
            <AtomicStructureLab key={currentTopic.id} tab={currentTopic.id === 's-2-3' ? 3 : 1} />
          </div>
        )}
        {/* 9701: the atomic-structure lab raised to AS (1.1–1.4, 2.1) and A Level (28.1, 28.3), opened at the topic's part */}
        {ATOMIC_9701_TOPICS[currentTopic.id] && (
          <div className="mb-6">
            <Atomic9701Lab level={ATOMIC_9701_TOPICS[currentTopic.id].level} tab={ATOMIC_9701_TOPICS[currentTopic.id].tab} />
          </div>
        )}
        {/* The teacher's chemical-bonding lab: IGCSE 2.4–2.7 at 0620, AS 3.1–3.7 and 4.2 at 9701, opened at the topic's part */}
        {BONDING_TOPICS[currentTopic.id] && (
          <div className="mb-6">
            <BondingLab syllabus={BONDING_TOPICS[currentTopic.id].syllabus} tab={BONDING_TOPICS[currentTopic.id].tab} />
          </div>
        )}
        {/* The teacher's intermolecular-forces lab: IGCSE 2.5 at 0620, AS 3.6 at 9701 */}
        {IMF_TOPICS[currentTopic.id] && (
          <div className="mb-6">
            <IntermolecularLab syllabus={IMF_TOPICS[currentTopic.id].syllabus} tab={IMF_TOPICS[currentTopic.id].tab} />
          </div>
        )}
        {/* 9701 Halogen compounds: the SN1 and SN2 mechanisms in 3D, at the AS level (chapter 15) or the A Level (chapter 31) */}
        {(currentTopic.chapterId === 'al-ch-15' || currentTopic.chapterId === 'al-ch-31') && (
          <div className="mb-6">
            <SubstitutionMechanismLab mn={mode === 'mn'} level={currentTopic.chapterId === 'al-ch-31' ? 'al' : 'as'} />
          </div>
        )}
        {/* Step 2b: Interactive visuals — change a value and watch the chemistry respond */}
        <LessonVisuals topicId={currentTopic.id} showLinks={false} />
        </div>

        <div className={topicPart === 'concept' ? '' : 'hidden'}>
        {/* The chapter's concept map, at the top of its concepts (it was at the foot of the lesson) */}
        {programme === 'igcse' && currentTopic.chapterId === 'ch-states-of-matter' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
            <StatesConceptMap mn={mode === 'mn'} onOpenTopic={setSelectedTopicId} />
          </div>
        )}
        {/* Step 3: High-Fidelity Scientific Visual Asset */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div
            className={`flex items-center gap-5 bg-slate-50 p-4 sm:p-5 dark:bg-slate-950 ${
              ['al-ch-3', 'al-ch-23'].includes(currentTopic.chapterId) ? 'flex-col' : ''
            }`}
          >
            {currentTopic.chapterId === 'ch-acids-bases' ? (
              <TitrationAnimation mn={mode === 'mn'} className="h-36 w-auto shrink-0 sm:h-40" />
            ) : currentTopic.chapterId === 'ch-electrochemistry' ? (
              <ElectrolysisAnimation mn={mode === 'mn'} className="h-36 w-auto shrink-0 sm:h-40" />
            ) : ['al-ch-3', 'al-ch-23'].includes(currentTopic.chapterId) ? (
              <LatticeHolesPicture mn={mode === 'mn'} className="w-full" />
            ) : (
              <ParticleAnimation mn={mode === 'mn'} className="h-36 w-auto shrink-0 sm:h-40" />
            )}
            <div className="min-w-0 space-y-1">
              <span className="block font-mono text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                Conclude and self-assess
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                <ChemText>{mode === 'mn' ? currentTopic.titleMn : currentTopic.titleEn}</ChemText>
              </p>
            </div>
          </div>
        </div>

        {/* Step 4: Step-by-Step Interactive Lesson Explanations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {mode === 'mn' ? 'Хичээлийн тайлбар' : 'Concept Breakdown'}
            </h3>
          </div>

          <div className="space-y-6">
            {currentTopic.sections.filter(sec => contentLevel === 'extended' || sec.tier !== 'extended').map(sec => (
              <div key={sec.id} className="space-y-3">
                <h4 className="text-base font-bold text-emerald-700 dark:text-teal-300 flex flex-wrap items-center gap-2">
                  <ChemText>{mode === 'mn' ? sec.titleMn : sec.titleEn}</ChemText>
                  {sec.tier === 'extended' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
                      Extended
                    </span>
                  )}
                </h4>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  <ChemText>{mode === 'mn' ? sec.contentMn : sec.contentEn}</ChemText>
                </p>

                {mode === 'dual' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line border-l-2 border-slate-300 dark:border-slate-700 pl-3">
                    <ChemText>{sec.contentMn}</ChemText>
                  </p>
                )}

                {sec.keyRuleEn && (
                  <div className="p-3 bg-emerald-50 dark:bg-teal-950/30 border border-emerald-200 dark:border-teal-800/60 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-800 dark:text-teal-400 block font-mono">
                      {mode === 'mn' ? '💡 Алтан дүрэм / Дүгнэлт:' : '💡 Key Rule to Remember:'}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">
                      <ChemText>{mode === 'mn' ? sec.keyRuleMn : sec.keyRuleEn}</ChemText>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        </div>

        <div className={topicPart === 'example' ? '' : 'hidden'}>
        {/* Step 5: Worked Example & Common Pitfall */}
        {examples.map(ex => (
          <React.Fragment key={ex.id}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {mode === 'mn' ? 'Ажилласан жишээ ба Шалгагчийн зөвлөгөө' : 'Worked Example & Common Pitfalls'}
            </h3>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                <ChemText>{ex.titleEn}</ChemText>
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                <ChemText>{mode === 'mn' ? ex.questionMn : ex.questionEn}</ChemText>
              </p>
            </div>

            {/* Step-by-step Solution */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-teal-400 block font-mono">
                {mode === 'mn' ? 'Алхам алхмаар бодолт:' : 'Step-by-Step Mark Scheme Working:'}
              </span>
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {(mode === 'mn'
                  ? ex.stepsMn
                  : ex.stepsEn
                ).map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-teal-400 font-mono">✔</span>
                    <span><ChemText>{step}</ChemText></span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Final Answer:</span>
                <span className="text-emerald-700 dark:text-teal-300 font-bold font-mono">
                  <ChemText>{mode === 'mn' ? ex.finalAnswerMn : ex.finalAnswerEn}</ChemText>
                </span>
              </div>
            </div>

            {/* Common Mistake Warning */}
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs space-y-1">
              <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {mode === 'mn' ? 'Сурагчдын түгээмэл алддаг зүйл:' : 'Common Examiner Warning:'}
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                <ChemText>{mode === 'mn' ? ex.commonMistakeMn : ex.commonMistakeEn}</ChemText>
              </p>
            </div>

            {/* Examiner Tip */}
            {ex.examinerTipEn && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 font-mono">
                  💡 {mode === 'mn' ? 'Шалгагчийн зөвлөгөө (Examiner Tip):' : 'Cambridge Examiner Tip:'}
                </span>
                <p className="text-slate-700 dark:text-slate-300">
                  <ChemText>{mode === 'mn' ? ex.examinerTipMn : ex.examinerTipEn}</ChemText>
                </p>
              </div>
            )}
          </div>
        </div>
          </React.Fragment>
        ))}

        </div>

        <div className={topicPart === 'sim' ? '' : 'hidden'}>

        </div>

        <div className={topicPart === 'practice' ? '' : 'hidden'}>
        {/* Calculation examples and problems for this chapter: one link to the Calculations tab, not a copy */}
        {CALC_CHAPTERS.some(c => c.id === currentTopic.chapterId) && (
          <button
            onClick={() => jumpToCalculation(currentTopic.chapterId)}
            className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-sm transition-colors"
          >
            <span>{mode === 'mn' ? 'Тооцооллын жишээ ба бодлого нээх' : 'Open calculation examples & problems'}</span>
          </button>
        )}
        {/* Step 7: Practice Exam Questions with Easy / Medium / Hard Difficulty Levels */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {mode === 'mn' ? 'Сэдвийн шалгалтын тестүүд (3 түвшин)' : 'Topic Exam Quizzes (3 Levels)'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {mode === 'mn' ? 'Easy, Medium, Hard түвшнээр ангилсан дасгалууд' : 'Graded across Easy, Medium, and Hard difficulty'}
                <span className="ml-2 font-bold text-slate-700 dark:text-slate-200">
                  {mode === 'mn' ? `${visibleQuizQuestions.length} асуулт` : `${visibleQuizQuestions.length} questions`}
                </span>
                <span className="ml-2 font-bold text-slate-700 dark:text-slate-200">
                  {quizOver
                    ? mode === 'mn' ? 'Хугацаа дууслаа' : 'Time is up'
                    : quizLeft === null
                      ? mode === 'mn' ? 'Хугацаа 30 мин' : '30 min limit'
                      : `${mode === 'mn' ? 'Үлдсэн' : 'Left'} ${Math.floor(quizLeft / 60)}:${String(quizLeft % 60).padStart(2, '0')}`}
                </span>
              </p>
              {quizStarted && (
                <button
                  type="button"
                  onClick={restartQuiz}
                  className="mt-2 px-3 py-1.5 rounded-lg border border-emerald-500 text-xs font-bold text-emerald-800 dark:text-teal-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  {quizOver
                    ? mode === 'mn' ? 'Хугацаа дууслаа. Дахин эхлэх' : 'Time is up. Start again'
                    : mode === 'mn' ? 'Дахин эхлэх' : 'Start again'}
                </button>
              )}
              <a
                href={programme === 'alevel' ? ALEVEL_PAST_PAPERS_URL : IGCSE_PAST_PAPERS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-teal-300 hover:underline"
              >
                {mode === 'mn' ? 'Албан ёсны past paper (Cambridge) ↗' : 'Official past papers (Cambridge) ↗'}
              </a>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {mode === 'mn'
                  ? 'Асуултыг Cambridge-ийн сайтаас татаж бодно уу. Асуултын текст энэ аппд байрлахгүй.'
                  : 'Work the official papers from the Cambridge site. Their questions are not copied into this app.'}
              </p>
            </div>

            {/* Difficulty Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold">
              {(['All', 'easy', 'medium', 'hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setTopicQuizDifficulty(diff)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                    topicQuizDifficulty === diff
                      ? diff === 'easy'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : diff === 'medium'
                        ? 'bg-amber-600 text-white font-bold shadow-xs'
                        : diff === 'hard'
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'bg-slate-800 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {diff === 'All'
                    ? (mode === 'mn' ? 'Бүгд' : 'All')
                    : diff === 'easy'
                    ? (mode === 'mn' ? 'Хялбар' : 'Easy')
                    : diff === 'medium'
                    ? (mode === 'mn' ? 'Дунд' : 'Med')
                    : (mode === 'mn' ? 'Хүнд' : 'Hard')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {visibleQuizQuestions.map((q, index) => {
                const selectedOption = selectedAnswers[q.id];
                // A multiple-choice answer shows its explanation once picked; a structured one when the mark scheme is opened
                const isRevealed = q.type === 'mcq' ? !!selectedOption : !!revealedSolutions[q.id];
                const { level, verb } = taxonomyInfo(q);
                const effectiveDiff = quizLevel(q);

                return (
                  <div
                    key={q.id}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-emerald-700 dark:text-teal-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {q.paper}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            effectiveDiff === 'easy'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : effectiveDiff === 'medium'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {effectiveDiff === 'easy' ? 'Easy / Хялбар' : effectiveDiff === 'medium' ? 'Medium / Дунд' : 'Hard / Хүнд'}
                        </span>
                        <span>{q.syllabusRef}</span>
                        {(

                          <span
                            title={mode === 'mn' ? 'Бодлогын түвшин (ээлжит хичээлийн үнэлгээ, 5-р шалгуур)' : 'Thinking level (lesson assessment, item 5)'}
                            className="px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-semibold"
                          >
                            {mode === 'mn'
                              ? `${TAXONOMY_LABEL[level].mn}${verb ? ` · "${verb}"` : ''} · ${TAXONOMY_LABEL[level].weight} оноо`
                              : `${TAXONOMY_LABEL[level].en}${verb ? ` · "${verb}"` : ''} · ${TAXONOMY_LABEL[level].weight} pt`}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white">[{q.totalMarks} Marks]</span>
                    </div>

                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h4 className="pt-1 text-sm font-bold text-slate-900 dark:text-white">
                      <ChemText>{mode === 'mn' ? q.titleMn : q.titleEn}</ChemText>
                    </h4>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    <ChemText>{mode === 'mn' ? q.questionTextMn : q.questionTextEn}</ChemText>
                  </p>

                  {/* Multiple Choice Options */}
                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-2 pt-2">
                      {q.options.map(opt => {
                        const isChosen = selectedOption === opt.id;
                        const isCorrectOption = opt.id === q.correctOption;

                        let style = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80';
                        if (isRevealed) {
                          if (isCorrectOption) {
                            style = 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (isChosen && !isCorrectOption) {
                            style = 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-200 font-medium';
                          }
                        }

                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectOption(q, opt.id)}
                            disabled={quizOver}
                            className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-3 shadow-xs ${style}`}
                          >
                            <span className="font-mono font-bold text-slate-500 shrink-0">
                              {opt.id}.
                            </span>
                            <div className="space-y-1">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                <ChemText>{mode === 'mn' ? opt.textMn : opt.textEn}</ChemText>
                              </span>
                              {isRevealed && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                                  <ChemText>{mode === 'mn' ? opt.rationaleMn : opt.rationaleEn}</ChemText>
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Structured questions: the learner writes an answer and submits it; only then does the mark scheme open */}
                  {q.type !== 'mcq' && (
                    <div className="pt-2 space-y-3">
                      <AnswerPad questionId={q.id} mn={mode === 'mn'} />
                      {!isSubmitted(q.id) && (
                        <button
                          type="button"
                          onClick={() => submitStructured(q.id)}
                          disabled={quizOver}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
                        >
                          {mode === 'mn' ? 'Хариултаа илгээх' : 'Submit my answer'}
                        </button>
                      )}
                      {isSubmitted(q.id) && (
                        <>
                      <button
                        onClick={() => toggleStructuredReveal(q.id)}
                        className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-teal-300 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 shadow-xs"
                      >
                        {isRevealed
                          ? (mode === 'mn' ? 'Шалгуурыг нуух' : 'Hide Mark Scheme')
                          : (mode === 'mn' ? 'Кэмбрижийн үнэлгээний шалгуурыг харах' : 'View Cambridge Mark Scheme')}
                      </button>

                      {isRevealed && q.markScheme && (
                        <div className="mt-3 p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                          <span className="font-mono font-bold text-emerald-700 dark:text-teal-400 block border-b border-slate-200 dark:border-slate-800 pb-1">
                            Official Cambridge Mark Scheme:
                          </span>
                          <div className="space-y-2">
                            {q.markScheme.map(ms => (
                              <div key={ms.pointIndex} className="space-y-1">
                                <div className="text-slate-800 dark:text-slate-200 font-medium flex items-start justify-between gap-2">
                                  <span><ChemText>{mode === 'mn' ? ms.criterionMn : ms.criterionEn}</ChemText></span>
                                  <span className="font-mono font-bold text-emerald-600 dark:text-teal-400 shrink-0">
                                    [{ms.marks}]
                                  </span>
                                </div>
                                {ms.examinerNoteEn && (
                                  <div className="text-[11px] text-amber-700 dark:text-amber-300/80 pl-2 border-l border-amber-500/40">
                                    Examiner note: <ChemText>{mode === 'mn' ? ms.examinerNoteMn : ms.examinerNoteEn}</ChemText>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>
        {/* Before the end-of-topic test: a review with the chapter's concept map */}
        {shown.chapterId !== 'ch-states-of-matter' && CONCEPT_MAPS[shown.chapterId] && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>{mode === 'mn' ? 'Шалгалтын өмнө:' : 'Before the test:'}</span>
            <ConceptMapButton mn={mode === 'mn'} purpose="review" />
          </div>
        )}
        {/* The end-of-topic test opens once every objective and key word of the topic is rated; until then the ratings are
            asked here. The teacher and full-access students see the test at once. */}
        {shown.chapterId !== 'ch-states-of-matter' && (access === 'open' || topicProgress(shown, selfCheck, contentLevel).complete) && (
          <TopicCheck
            key={shown.id}
            topic={shown}
            mn={mode === 'mn'}
            nextTopic={nextTopic}
            onOpenTopic={openTopic}
            onNext={() => nextTopic && openTopic(nextTopic.id)}
          />
        )}
        {shown.chapterId !== 'ch-states-of-matter' && !(access === 'open' || topicProgress(shown, selfCheck, contentLevel).complete) && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              <Lock className="w-4 h-4" aria-hidden="true" />
              {mode === 'mn' ? 'Сэдвийн шалгалт' : 'End-of-topic check'}
            </div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              {mode === 'mn'
                ? 'Сэдвийн шалгалт энэ сэдвийн сурах зорилт, түлхүүр үгийг бүгдийг «Чадна» эсвэл «Хараахан» гэж үнэлсний дараа нээгдэнэ.'
                : 'The end-of-topic check opens once every objective and key word of this topic is rated: I can, or not yet.'}
            </p>
            <SelfCheckList topic={shown} mn={mode === 'mn'} level={contentLevel} />
          </section>
        )}
        {/* Topic navigation at the foot of the lesson, in the page flow: the previous topic and the next one. A locked
            next topic stays shown but cannot be opened until this one is passed. */}
        <nav aria-label={mode === 'mn' ? 'Сэдэв солих' : 'Topic navigation'} className="flex items-stretch gap-3 pt-2">
          <button
            type="button"
            onClick={() => prevTopic && selectTopic(prevTopic.id)}
            disabled={!prevTopic}
            title={prevTopic ? (mode === 'mn' ? prevTopic.titleMn : prevTopic.titleEn) : undefined}
            className="flex-1 min-w-0 flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-left text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex flex-col">
              <span>{mode === 'mn' ? 'Өмнөх сэдэв' : 'Previous topic'}</span>
              {prevTopic && <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{mode === 'mn' ? prevTopic.titleMn : prevTopic.titleEn}</span>}
            </span>
          </button>
          <button
            type="button"
            onClick={() => nextTopic && !nextLocked && selectTopic(nextTopic.id)}
            disabled={!nextTopic || nextLocked}
            title={nextTopic ? (nextLocked ? (mode === 'mn' ? 'Өмнөх сэдвийг эхлээд дуусга' : 'Pass the topic before first') : (mode === 'mn' ? nextTopic.titleMn : nextTopic.titleEn)) : undefined}
            className="flex-1 min-w-0 flex items-center justify-end gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-left text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="min-w-0 flex flex-col items-end">
              <span>{mode === 'mn' ? 'Дараагийн сэдэв' : 'Next topic'}</span>
              {nextTopic && <span className="truncate text-xs font-medium text-emerald-100">{mode === 'mn' ? nextTopic.titleMn : nextTopic.titleEn}</span>}
            </span>
            {nextLocked ? <Lock className="w-4 h-4 shrink-0" aria-hidden /> : <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />}
          </button>
        </nav>
        </div>
      </div>
    </div>
  );
};
