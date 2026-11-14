import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AppProvider, COURSE_CHOICES, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CurriculumView } from './components/CurriculumView';
import { VirtualLabsView } from './components/VirtualLabsView';
import { ExamPrepView } from './components/ExamPrepView';
import { TestsView } from './components/TestsView';
import { AlevelPastPapers } from './components/AlevelPastPapers';
import { FlashcardsView } from './components/FlashcardsView';
import { GameArenaView } from './components/GameArenaView';
import { MistakeNotebookView } from './components/MistakeNotebookView';
import { TeacherPortalView } from './components/TeacherPortalView';
import { LoginView } from './components/LoginView';
import { CambridgeSkillsView } from './components/CambridgeSkillsView';
import { CalculationsView } from './components/CalculationsView';
import { NotebookView } from './components/NotebookView';
import { PeriodicTableExplorer } from './components/simulators/PeriodicTableExplorer';
import { StudentArea } from './components/StudentArea';
import { HubView } from './components/HubView';
import { Encourager } from './components/Encourager';
import { FlaskConical } from 'lucide-react';
import { useResultSync } from './lib/resultSync';
import { isTeacher, requestEnrollment, signOutUser, useAuthUser, useEnrollment } from './lib/cloud';
import { useTeacherOnScreen } from './lib/viewAs';
import { EnrollmentGate } from './components/EnrollmentGate';
import { isFirebaseConfigured } from './lib/firebase';
import { SelfRatingGate } from './components/SelfRatingGate';
import { SignInGuide } from './components/SignInGuide';
import { useSelfRated, useSelfRatingSync } from './components/SelfRating';
import { useLessonProgressRestore } from './lib/progressRestore';
import { useAccountCopy } from './lib/accountCopy';
import { HowToStudy } from './components/HowToStudy';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, programme, courseChoice } = useApp();
  // Keeps the signed-in student's results in the teacher's copy, whichever tab is open
  useResultSync();
  // The lessons open once the student has rated the self-rating for the course; the teacher's account always sees them
  const { user, ready } = useAuthUser();
  // A signed-in student's rating is brought into line with the account, so it is not asked again on another device
  useSelfRatingSync(user);
  // The lessons a student has opened stay open on any device: the best exit-ticket scores come back from the account
  useLessonProgressRestore(user);
  // The answers, quick checks, predictions and finished topics come back from the account, so the work is kept on any device
  useAccountCopy(user);
  const rated = useSelfRated(courseChoice);
  // Looking at the site as a student (lib/viewAs), the teacher's account gets the student's pages: the self-rating first,
  // and no Teacher page. Access and saving stay the teacher's.
  const teacherOnScreen = useTeacherOnScreen(user);
  const lessonsOpen = rated || teacherOnScreen;
  // The site is closed: only the teacher, and students approved for this programme, see it. Others see the sign-in or the request.
  const enrollment = useEnrollment(user?.uid, courseChoice);
  const gated = isFirebaseConfigured && !(user && (isTeacher(user) || enrollment?.status === 'approved'));
  // Until the sign-in and the enrollment are known, the page stays empty, so nothing flashes to a student who may not see it
  const loading = isFirebaseConfigured && (!ready || (!!user && !isTeacher(user) && enrollment === undefined));
  // The page takes the colour of the course on screen; index.css sets the colours for each course
  React.useEffect(() => {
    document.documentElement.dataset.course = courseChoice;
  }, [courseChoice]);
  const { mode } = useLanguage();

  if (loading) return null;

  if (gated) {
    const course = COURSE_CHOICES.find(c => c.id === courseChoice);
    return (
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-10 pb-16 space-y-6">
          <div className="space-y-2 text-center">
            <div className="text-lg font-black">Cambridge Chemistry Study Hub</div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {mode === 'en' ? 'The content opens for students enrolled in this programme only.' : mode === 'mn' ? 'Агуулга зөвхөн энэ хөтөлбөрт элссэн суралцагчдад нээгдэнэ.' : (
                <>
                  The content opens for students enrolled in this programme only.
                  <span className="block text-xs opacity-75">Агуулга зөвхөн энэ хөтөлбөрт элссэн суралцагчдад нээгдэнэ.</span>
                </>
              )}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="space-y-3">
          {!user ? (
            <LoginView />
          ) : (
            <>
              <EnrollmentGate
                mn={mode === 'mn'}
                programmeLabel={course?.labelEn ?? ''}
                status={enrollment?.status ?? null}
                defaultName={user.displayName ?? ''}
                onRequest={(name, grade) => requestEnrollment(user.uid, courseChoice, name, grade)}
              />
              {/* A signed-in account that is not the teacher's or enrolled has no other way out here: this signs it out */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span>
                  {mode === 'mn'
                    ? 'Өөр бүртгэлээр нэвтрэх бол эхлээд гарна уу.'
                    : 'To sign in with another account, sign out first.'}
                </span>
                <button
                  type="button"
                  onClick={() => signOutUser().catch(() => undefined)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-300"
                >
                  {mode === 'mn' ? 'Гарах' : 'Sign out'}
                </button>
              </div>
            </>
          )}
          </div>
          {/* The sign-in steps in text, and the QR code of this address, beside the sign-in or the enrollment window */}
          <SignInGuide />
          </div>
        </main>
      </div>
    );
  }

  return (
    // The teacher page has its own plain background; every other page keeps the app background
    <div className={`min-h-screen ${activeTab === 'teacher' ? 'bg-slate-300' : 'bg-transparent'} text-slate-900 dark:text-slate-100 flex flex-col font-sans`}>
      <Navbar />

      {/* The lessons use the full width of the screen; the other pages keep the 1600px column */}
      <main className={`flex-1 w-full ${activeTab === 'curriculum' ? '' : 'max-w-[1600px] mx-auto '}px-4 sm:px-6 ${activeTab === 'curriculum' ? 'pt-4 sm:pt-2' : 'pt-6 sm:pt-8'}`}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'curriculum' && (
          <div className="space-y-6">
            {/* The self-rating starts the lessons; the teacher's account does not rate */}
            {!teacherOnScreen && <SelfRatingGate />}
            {lessonsOpen && <CurriculumView />}
          </div>
        )}
        {activeTab === 'student' && <StudentArea />}
        {activeTab === 'study' && <HubView hub="study" />}
        {activeTab === 'practice' && <HubView hub="practice" />}
        {activeTab === 'toolkit' && <HubView hub="toolkit" />}
        {activeTab === 'notebook' && <NotebookView />}
        {activeTab === 'help' && <HowToStudy />}
        {activeTab === 'labs' && <VirtualLabsView />}
        {activeTab === 'periodictable' && <PeriodicTableExplorer />}
        {activeTab === 'calculations' && <CalculationsView />}
        {/* 0620 has the full past-papers view; the 9701 courses list the official papers that are linked so far */}
        {activeTab === 'exam' && (programme === 'igcse' ? <ExamPrepView /> : <AlevelPastPapers />)}
        {activeTab === 'tests' && <TestsView />}
        {activeTab === 'skills' && <CambridgeSkillsView />}
        {activeTab === 'flashcards' && <FlashcardsView />}
        {activeTab === 'games' && <GameArenaView />}
        {activeTab === 'mistakes' && <MistakeNotebookView />}
        {activeTab === 'teacher' && teacherOnScreen && <TeacherPortalView />}
        {activeTab === 'login' && isFirebaseConfigured && <LoginView />}
      </main>

      <Encourager />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 py-8 px-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
            <span className="font-bold text-slate-800 dark:text-slate-200">Cambridge Chemistry 0620 · 9701 Study Hub</span>
            <span>·</span>
            <span>Cambridge IGCSE Chemistry (0620) Syllabus 2026–2028</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-600 dark:text-slate-400">
            <button onClick={() => setActiveTab('curriculum')} className="hover:text-black dark:hover:text-white transition-colors">
              {mode === 'mn' ? 'Хичээлүүд' : 'Syllabus'}
            </button>
            <button onClick={() => setActiveTab('labs')} className="hover:text-black dark:hover:text-white transition-colors">
              {mode === 'mn' ? 'Виртуал лаб' : 'Simulators'}
            </button>
            <button onClick={() => setActiveTab('exam')} className="hover:text-black dark:hover:text-white transition-colors">
              {mode === 'mn' ? 'Шалгалт (P2/4/6)' : 'Exam Papers'}
            </button>
            <button onClick={() => setActiveTab('skills')} className="hover:text-black dark:hover:text-white transition-colors">
              {mode === 'mn' ? 'Шалгалтын ур чадвар' : 'Exam Skills'}
            </button>
            <button onClick={() => setActiveTab('mistakes')} className="hover:text-black dark:hover:text-white transition-colors">
              {mode === 'mn' ? 'Алдааны сан' : 'Mistake Notebook'}
            </button>
            {!isTeacher(user) && isFirebaseConfigured && (
              <button
                onClick={() => setActiveTab('login')}
                className="hover:text-black dark:hover:text-white transition-colors"
              >
                {mode === 'mn' ? 'Багш нэвтрэх' : 'Teacher sign-in'}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
