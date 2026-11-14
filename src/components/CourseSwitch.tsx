import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { COURSE_CHOICES, useApp, type CourseChoice } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { SITE_COURSE } from '../lib/siteCourse';
import { useAuthUser } from '../lib/cloud';
import { useTeacherOnScreen } from '../lib/viewAs';

// Each programme has its own colour, so the course on screen is clear at a glance. In the top bar it is a light chip in that
// colour (soft), so it names the course without shouting; the dot marks each course in the list.
const COLOURS: Record<CourseChoice, { solid: string; soft: string; dot: string }> = {
  igcse: { solid: 'bg-emerald-600 text-white', soft: 'bg-emerald-50 text-emerald-800 border border-emerald-200', dot: 'bg-emerald-500' },
  as: { solid: 'bg-blue-600 text-white', soft: 'bg-blue-50 text-blue-800 border border-blue-200', dot: 'bg-blue-500' },
  a: { solid: 'bg-purple-600 text-white', soft: 'bg-purple-50 text-purple-800 border border-purple-200', dot: 'bg-purple-500' }
};

// The programme switch. Closed, it names the programme on screen; open, it lists all three in their colours.
export const CourseSwitch: React.FC = () => {
  const { courseChoice, chooseCourse } = useApp();
  const { mode } = useLanguage();
  const [open, setOpen] = useState(false);
  // A site locked to one course shows students its course only; the teacher's signed-in account keeps the switch
  // Looking at the site as a student (lib/viewAs), the teacher's account is locked to the site's course as a student is
  const { user } = useAuthUser();
  const teacherOnScreen = useTeacherOnScreen(user);
  const locked = SITE_COURSE !== null && !teacherOnScreen;

  const label = (id: CourseChoice) => {
    const choice = COURSE_CHOICES.find(c => c.id === id);
    return mode === 'mn' ? choice?.labelMn ?? '' : choice?.labelEn ?? '';
  };

  // A site locked to one course shows its course as a label only; there is no switch to the others
  if (locked) {
    return (
      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${COLOURS[courseChoice].soft}`}>
        {label(courseChoice)}
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${COLOURS[courseChoice].soft}`}
      >
        {label(courseChoice)}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl space-y-1">
          {COURSE_CHOICES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                chooseCourse(c.id);
                setOpen(false);
              }}
              aria-pressed={courseChoice === c.id}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                courseChoice === c.id
                  ? COLOURS[c.id].solid
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${COLOURS[c.id].dot}`} />
              {label(c.id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
