import React, { useState } from 'react';
import { BookOpen, ClipboardList, HelpCircle, Home, TrendingUp, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp, type AppTab } from '../context/AppContext';
import { HIGHLIGHT_HEADING, HIGHLIGHT_SUB } from '../lib/highlight';
import { useAuthUser } from '../lib/cloud';
import { useTeacherOnScreen } from '../lib/viewAs';

// The menus of the web, in the order of the top bar: Home, Study, Practice and My progress (and the Teacher area for the
// teacher). Each card says who the menu is for and what is inside it. The same cards are shown for every programme: IGCSE
// 0620, AS Level 9701 and A Level 9701. The labels follow the language toggle. The full guide is the help page (HowToStudy).
interface PageCard {
  tab: AppTab;
  icon: React.ReactNode;
  nameEn: string;
  nameMn: string;
  forEn: string;
  forMn: string;
  itemsEn: string[];
  itemsMn: string[];
}

const PAGES: PageCard[] = [
  {
    tab: 'dashboard',
    icon: <Home className="h-4 w-4" aria-hidden="true" />,
    nameEn: 'Home',
    nameMn: 'Нүүр',
    forEn: 'Everyone',
    forMn: 'Бүгд',
    itemsEn: [
      'Your next step: the next topic, ready with its lesson and practice',
      'Your progress: how far you have come, your ticket average and today’s goal',
      'Needs revision: the mistakes worth another look, from your notebook',
      'Spaced repetition: the flashcards due today, so no term slips away'
    ],
    itemsMn: [
      'Таны дараагийн алхам: дараагийн сэдэв, хичээл, дасгалтайгаа бэлэн',
      'Таны явц: хаана явж буйг, хичээлийн шалгалтын дундаж, өнөөдрийн зорилго',
      'Давтах хэрэгтэй: алдааны сангаас дахин харах ёстой алдаанууд',
      'Лейтнерийн флаш карт: өнөөдөр давтах карт, нэр томьёо мартахгүйн тулд'
    ]
  },
  {
    tab: 'study',
    icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
    nameEn: 'Study: learn something new',
    nameMn: 'Сурах: шинэ зүйл сурах',
    forEn: 'Students',
    forMn: 'Сурагч',
    itemsEn: [
      'Lessons: every chapter and topic of your course, with the 40-minute lessons and slides',
      'Each lesson: prediction, simulation, quick check, practice and the exit ticket, step by step',
      'Each topic: objectives, key words, a concept map and the end-of-topic test',
      'Virtual labs and the periodic table, and the guide How to study'
    ],
    itemsMn: [
      'Хичээл: таны хөтөлбөрийн бүх бүлэг, сэдэв, 40 минутын хичээл, слайдтай',
      'Хичээл бүр: таамаглал, симуляци, түргэн шалгалт, дасгал, гарах тасалбар, алхам алхмаар',
      'Сэдэв бүр: сурах зорилт, түлхүүр үг, ойлголтын зураглал, сэдвийн шалгалт',
      'Виртуал лаб, үелэх хүснэгт, «Хэрхэн суралцах вэ?» заавар'
    ]
  },
  {
    tab: 'practice',
    icon: <ClipboardList className="h-4 w-4" aria-hidden="true" />,
    nameEn: 'Practice: go over it, get ready for the exam',
    nameMn: 'Дадлага: давтах, шалгалтад бэлтгэх',
    forEn: 'Students',
    forMn: 'Сурагч',
    itemsEn: [
      'Exam practice or past papers, and the timed chapter tests',
      'Calculations and exam skills: worked examples, problems and command words',
      'Flashcards and practice games with key words and questions',
      'The outside practice sites selbe4you and grading4you'
    ],
    itemsMn: [
      'Шалгалтын дасгал эсвэл past paper, бүлгийн цагтай тест',
      'Тооцоолол, шалгалтын ур чадвар: жишээ бодолт, бодлого, command word',
      'Үг цээжлэх карт, түлхүүр үг, асуултын дасгалын тоглоом',
      'Гадаад дасгалын сайт: selbe4you, grading4you'
    ]
  },
  {
    tab: 'toolkit',
    icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
    nameEn: 'My progress: your results, mistakes and notes',
    nameMn: 'Миний явц: өөрийн дүн, алдаа, тэмдэглэл',
    forEn: 'Students',
    forMn: 'Сурагч',
    itemsEn: [
      'Progress and rewards: your results, your self-check of objectives and key words, and your rewards',
      'Mistake notebook: the questions you got wrong, to fix',
      'My notebook: lessons you pinned and your own notes',
      'Your self-check reaches your teacher by itself'
    ],
    itemsMn: [
      'Явц ба шагнал: өөрийн дүн, зорилт, түлхүүр үгийн үнэлгээ, шагнал',
      'Алдааны сан: буруу хариулсан асуултаа засах',
      'Миний дэвтэр: хадсан хичээл, өөрийн тэмдэглэл',
      'Таны үнэлгээ багшид автоматаар очдог'
    ]
  },
  {
    tab: 'teacher',
    icon: <Users className="h-4 w-4" aria-hidden="true" />,
    nameEn: 'Teacher area',
    nameMn: 'Багшийн талбар',
    forEn: 'Teacher',
    forMn: 'Багш',
    itemsEn: [
      'Students: each student’s results and feedback',
      'Enrollments: approve each student for a course',
      'A skills checklist and a test builder',
      'Add question: new questions for the question bank',
      'Slide decks and chapter test packages, for the teacher’s account'
    ],
    itemsMn: [
      'Суралцагчид: сурагч бүрийн үр дүн, санал',
      'Элсэлт: хөтөлбөр тус бүрт сурагчдыг зөвшөөрөх',
      'Ур чадварын явц, тест зохиох хэрэгсэл',
      'Асуулт нэмэх: асуултын санд шинэ асуулт',
      'Слайд, бүлгийн шалгалтын багц, зөвхөн багшийн дансаар'
    ]
  }
];

// The optional extra card fills the free cell beside the last page card, so the grid stays full on every width.
export const WebStructure: React.FC<{ extra?: React.ReactNode }> = ({ extra }) => {
  const { user } = useAuthUser();
  // The Teacher page card is for the teacher's own view; looking at the site as a student (lib/viewAs) it is hidden
  const teacherOnScreen = useTeacherOnScreen(user);
  const { mode } = useLanguage();
  const { setActiveTab } = useApp();
  const mn = mode === 'mn';
  // One page card can be opened at a time, to show all of its points
  const [openPage, setOpenPage] = useState<AppTab | null>(null);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="space-y-1">
        <div className={HIGHLIGHT_HEADING}>
          {mn ? 'Вэбийн бүтэц' : 'How the web is organised'}
        </div>
        <p className={HIGHLIGHT_SUB}>
          {mn
            ? 'Дээд талын дөрвөн цэс: Нүүр, Сурах, Дадлага, Миний явц.'
            : 'The four menus at the top: Home, Study, Practice and My progress.'}
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('help')}
          className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          {mn ? 'Хэрхэн суралцах вэ? Бүтэн заавар →' : 'How to study here: the full guide →'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PAGES.filter(page => page.tab !== 'teacher' || teacherOnScreen).map(page => {
          const isOpen = openPage === page.tab;
          const items = mn ? page.itemsMn : page.itemsEn;
          return (
            <div
              key={page.nameEn}
              className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab(page.tab)}
                  className="flex items-center gap-2 text-left text-sm font-bold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-teal-300"
                >
                  <span className="text-emerald-700 dark:text-teal-300">{page.icon}</span>
                  {mn ? page.nameMn : page.nameEn}
                </button>
                <span className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {mn ? page.forMn : page.forEn}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{items[0]}</p>
              {isOpen && (
                <ul className="space-y-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {items.slice(1).map(item => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setOpenPage(isOpen ? null : page.tab)}
                  aria-expanded={isOpen}
                  className="text-slate-600 hover:underline dark:text-slate-300"
                >
                  {isOpen ? (mn ? 'Хураах' : 'Show less') : mn ? 'Дэлгэрэнгүй' : 'More'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(page.tab)}
                  className="text-emerald-700 hover:underline dark:text-teal-300"
                >
                  {mn ? 'Хуудас руу орох →' : 'Open page →'}
                </button>
              </div>
            </div>
          );
        })}
        {extra}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {mn
          ? 'Таны хариулт, явц таны аккаунтад хадгалагдаж, аль ч төхөөрөмж дээр буцаж гарна. Үр дүнг багш харна.'
          : 'Your answers and progress are kept on your account and come back on any device. Your teacher sees your results.'}
      </p>
    </section>
  );
};
