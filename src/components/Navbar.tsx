import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { CourseSwitch } from './CourseSwitch';
import { NoticeBell } from './NoticeBell';
import { TeacherBell } from './TeacherBell';
import { TeacherSiteLinks } from './TeacherSiteLinks';
import { courseMistakes } from '../data/courseScope';
import { isTeacher, signOutUser, useAuthUser } from '../lib/cloud';
import { isFirebaseConfigured } from '../lib/firebase';
import { setViewAs, useViewAs, type ViewAs } from '../lib/viewAs';
import {
  BookOpen,
  FlaskConical,
  ClipboardList,
  TrendingUp,
  Users,
  ChevronDown,
  LogIn,
  LogOut,
  Home,
  HelpCircle,
  Languages,
  UserRound,
  Repeat,
  Check
} from 'lucide-react';

// The top of every page, kept quiet so the page itself stands out:
//  - one bar: the logo and name, the programme, then on the right only the bell and the account menu;
//  - the account menu holds everything used now and then: how to study here, the account, the language, the teacher's
//    view switch, and signing out (or signing in);
//  - under it, the four pages (Home, Study, Practice, My progress, and Teacher for the teacher), the page on screen
//    underlined in the course colour. The browser's own back and forward buttons move between the pages.
// On the lessons page the pages sit in the top bar on wide screens, so the lesson keeps the height.

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge: number;
  onClick: () => void;
}

export const Navbar: React.FC = () => {
  const { mode, setMode } = useLanguage();
  const { activeTab, setActiveTab, setRole, mistakes, courseChoice } = useApp();
  // The teacher's pages and the view switch are for the teacher's signed-in account only. Looking at the site as a student
  // (lib/viewAs), the teacher's account gets the student's bar: no Teacher page, the student's bell.
  const { user } = useAuthUser();
  const teacherAccount = isTeacher(user);
  const viewAs = useViewAs();
  const teacherSignedIn = teacherAccount && viewAs === 'teacher';
  const VIEWS: { id: ViewAs; label: string; note: string }[] = [
    { id: 'teacher', label: mode === 'mn' ? 'Багш' : 'Teacher', note: mode === 'mn' ? 'Бүх зүйл нээлттэй, багшийн хуудсууд' : 'Everything open, the teacher’s pages' },
    { id: 'gated', label: mode === 'mn' ? 'Сурагч — хэсэгчилсэн' : 'Student — gated', note: mode === 'mn' ? 'Хичээл 60%-иар нэг нэгээр нээгдэнэ' : 'Lessons open one by one above 60%' },
    { id: 'full', label: mode === 'mn' ? 'Сурагч — бүтэн' : 'Student — full', note: mode === 'mn' ? 'Бүх хичээл нээлттэй, сурагчийн дэлгэц' : 'Every lesson open, the student’s screen' }
  ];
  // Changes the view: the page goes Home, so the teacher sees the site from the start as that student would
  const chooseView = (view: ViewAs) => {
    setViewAs(view);
    setRole(view === 'teacher' ? 'teacher' : 'student');
    setMenuOpen(false);
    if (view !== 'teacher' && activeTab === 'teacher') setActiveTab('dashboard');
  };
  const mn = mode === 'mn';
  const unresolvedMistakesCount = courseMistakes(mistakes, courseChoice).filter(m => !m.resolved).length;

  // The account menu: open and closed, and closed by a click outside it
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);
  const go = (tab: Parameters<typeof setActiveTab>[0]) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  // The initials on the account button: from the name, else the e-mail; a person icon when nobody is signed in
  const who = (user?.displayName || user?.email || '').trim();
  const initials = who
    ? who
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase() ?? '')
        .join('')
    : '';

  // Each page is lit when one of its pages is open (components/HubView): Study, Practice and My progress (id 'toolkit').
  // My progress counts the mistakes still to fix.
  const studyActive = activeTab === 'study' || ['curriculum', 'mindmap', 'labs', 'periodictable', 'help'].includes(activeTab);
  const practiceActive = activeTab === 'practice' || ['exam', 'tests', 'calculations', 'skills', 'flashcards', 'games'].includes(activeTab);
  const toolkitActive = activeTab === 'toolkit' || ['student', 'mistakes', 'notebook'].includes(activeTab);
  const tabs: Tab[] = [
    { id: 'dashboard', label: mn ? 'Нүүр' : 'Home', icon: <Home className="h-4 w-4" aria-hidden="true" />, active: activeTab === 'dashboard', badge: 0, onClick: () => setActiveTab('dashboard') },
    { id: 'study', label: mn ? 'Сурах' : 'Study', icon: <BookOpen className="h-4 w-4" aria-hidden="true" />, active: studyActive, badge: 0, onClick: () => setActiveTab('study') },
    { id: 'practice', label: mn ? 'Дадлага' : 'Practice', icon: <ClipboardList className="h-4 w-4" aria-hidden="true" />, active: practiceActive, badge: 0, onClick: () => setActiveTab('practice') },
    { id: 'toolkit', label: mn ? 'Миний явц' : 'My progress', icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />, active: toolkitActive, badge: unresolvedMistakesCount, onClick: () => setActiveTab('toolkit') },
    ...(teacherSignedIn
      ? [{ id: 'teacher', label: mn ? 'Багш' : 'Teacher', icon: <Users className="h-4 w-4" aria-hidden="true" />, active: activeTab === 'teacher', badge: 0, onClick: () => setActiveTab('teacher') }]
      : [])
  ];

  // One page button: icon and name side by side (above each other on a phone), underlined in the course colour when open
  const tabButton = (t: Tab) => (
    <button
      key={t.id}
      type="button"
      onClick={t.onClick}
      aria-current={t.active ? 'page' : undefined}
      className={`relative flex flex-1 sm:flex-none flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm font-semibold border-b-2 transition-colors ${
        t.active
          ? 'border-emerald-600 text-emerald-800 dark:border-teal-400 dark:text-teal-300'
          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-white'
      }`}
    >
      {t.icon}
      <span className="truncate max-w-full">{t.label}</span>
      {t.badge > 0 && (
        <span className="absolute top-1 right-2 sm:static rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-4 text-white" aria-label={mn ? `${t.badge} засах алдаа` : `${t.badge} mistakes to fix`}>
          {t.badge}
        </span>
      )}
    </button>
  );

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, extra?: React.ReactNode) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {extra}
    </button>
  );

  // On the lessons page the pages sit in the top bar on wide screens; elsewhere, and on phones, in the row below
  const oneRow = activeTab === 'curriculum';
  const width = activeTab === 'curriculum' ? '' : 'max-w-[1600px] mx-auto ';

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur">
      <div className={`${width}px-3 sm:px-6 h-14 flex items-center gap-3`}>
        {/* The logo and name: back to Home */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="flex shrink-0 items-center gap-2.5 text-slate-900 dark:text-white"
          aria-label={mn ? 'Нүүр хуудас' : 'Home'}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline text-base font-bold tracking-tight">Chemistry Study Hub</span>
        </button>
        <CourseSwitch />

        {/* The lessons page: the pages in the top bar on wide screens */}
        {oneRow && (
          <nav aria-label={mn ? 'Хуудас' : 'Pages'} className="hidden lg:flex flex-1 min-w-0 items-end justify-center self-stretch">
            {tabs.map(tabButton)}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* The teacher's links to the three student sites, and the bell: a student's notices of their own programme, or the
              teacher's alerts (enrolment requests and new results) */}
          {teacherSignedIn && <TeacherSiteLinks />}
          {user && (teacherSignedIn ? <TeacherBell /> : <NoticeBell />)}

          {/* The account menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-expanded={menuOpen}
              aria-label={mn ? 'Цэс' : 'Menu'}
              className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {initials || <UserRound className="h-4 w-4" aria-hidden="true" />}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {user && (
                  <div className="border-b border-slate-100 px-3 pb-2 pt-1.5 dark:border-slate-800">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.displayName || user.email}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {teacherSignedIn ? (mn ? 'Багш' : 'Teacher') : mn ? 'Сурагч' : 'Student'}
                    </div>
                  </div>
                )}
                <div className="py-1">
                  {menuItem(<HelpCircle className="h-4 w-4" />, mn ? 'Хэрхэн суралцах вэ? (заавар)' : 'How to study here', () => go('help'))}
                  {isFirebaseConfigured && menuItem(<UserRound className="h-4 w-4" />, user ? (mn ? 'Миний данс' : 'My account') : mn ? 'Нэвтрэх' : 'Log in', () => go('login'))}
                </div>
                {/* The teacher's account: look at the site as the teacher, as a gated student or as a full-access student */}
                {teacherAccount && (
                  <div className="border-t border-slate-100 py-1 dark:border-slate-800">
                    <div className="flex items-center gap-2 px-3 pb-1 pt-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                      {mn ? 'Харах горим' : 'View as'}
                    </div>
                    {VIEWS.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => chooseView(v.id)}
                        aria-pressed={viewAs === v.id}
                        className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                          {viewAs === v.id && <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-slate-800 dark:text-slate-100">{v.label}</span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">{v.note}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {/* The language: English, Mongolian, or both */}
                <div className="border-t border-slate-100 py-1 dark:border-slate-800">
                  <div className="flex items-center gap-2 px-3 pb-1 pt-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                    {mn ? 'Хэл' : 'Language'}
                  </div>
                  {([
                    { id: 'mn', label: 'Монгол' },
                    { id: 'en', label: 'English' },
                    { id: 'dual', label: 'Dual (English + Монгол)' }
                  ] as const).map(option =>
                    menuItem(
                      <span className="inline-block h-4 w-4" />,
                      option.label,
                      () => {
                        setMode(option.id);
                        setMenuOpen(false);
                      },
                      mode === option.id ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : null
                    )
                  )}
                </div>
                {user && (
                  <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                    {menuItem(<LogOut className="h-4 w-4" />, mn ? 'Гарах' : 'Sign out', () => {
                      setMenuOpen(false);
                      signOutUser().catch(() => {});
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Signed out: a plain Log in button beside the menu */}
          {!user && isFirebaseConfigured && (
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {mn ? 'Нэвтрэх' : 'Log in'}
            </button>
          )}
        </div>
      </div>

      {/* The pages, in the row under the bar (hidden from the lg breakpoint on the lessons page, where they sit above) */}
      <div className={`border-t border-slate-100 dark:border-slate-800 ${oneRow ? 'lg:hidden' : ''}`}>
        <nav aria-label={mn ? 'Хуудас' : 'Pages'} className={`${width}flex px-1 sm:px-4`}>
          {tabs.map(tabButton)}
        </nav>
      </div>

      {/* The teacher's account looking at the site as a student: said on every page, with one press back */}
      {teacherAccount && viewAs !== 'teacher' && (
        <div className="border-t border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <div className={`${width}flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs sm:px-6`}>
            <span className="font-bold text-amber-900 dark:text-amber-200">
              {viewAs === 'gated'
                ? mn ? 'Сурагчийн нүдээр харж байна: хэсэгчилсэн эрх (хичээл 60%-иар нээгдэнэ)' : 'Viewing as a student: gated access (lessons open above 60%)'
                : mn ? 'Сурагчийн нүдээр харж байна: бүтэн эрх (бүх хичээл нээлттэй)' : 'Viewing as a student: full access (every lesson open)'}
            </span>
            <button
              type="button"
              onClick={() => chooseView(viewAs === 'gated' ? 'full' : 'gated')}
              className="rounded-md border border-amber-300 bg-white px-2 py-0.5 font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-transparent dark:text-amber-200"
            >
              {viewAs === 'gated' ? (mn ? 'Бүтэн эрхээр харах' : 'View with full access') : mn ? 'Хэсэгчилсэн эрхээр харах' : 'View with gated access'}
            </button>
            <button
              type="button"
              onClick={() => chooseView('teacher')}
              className="ml-auto rounded-md bg-amber-600 px-2.5 py-0.5 font-bold text-white hover:bg-amber-500"
            >
              {mn ? 'Багшийн горимд буцах' : 'Back to the teacher view'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
