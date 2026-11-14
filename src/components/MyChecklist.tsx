import React, { useMemo } from 'react';
import { ListChecks } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { isTeacher, useAuthUser, useEnrollment } from '../lib/cloud';
import { usePreviewAccess, useTeacherOnScreen } from '../lib/viewAs';
import { chapterProgress, useSelfCheck, type Level } from '../lib/selfCheck';
import { buildChecklist, chaptersOf, readChecklistState, useChecklistTick, type Checklist } from '../lib/chapterChecklist';
import { ChapterChecklist } from './ChapterChecklist';

// The signed-in student's checklist of the programme on screen, read again whenever something is finished. My progress
// shows it whole; the home page shows its next step.
export const useMyChecklist = (): Checklist => {
  const { courseChoice, stats } = useApp();
  const { user } = useAuthUser();
  const teacher = !!user && isTeacher(user);
  const enrollment = useEnrollment(user && !teacher ? user.uid : undefined, courseChoice);
  // A Core IGCSE student is counted on the Core lessons and objectives; full access (and the teacher's own view) opens
  // every lesson. The teacher looking at the site as a student (lib/viewAs) gets that student's access.
  const level: Level = courseChoice === 'igcse' && enrollment?.track === 'core' ? 'core' : 'extended';
  const teacherOnScreen = useTeacherOnScreen(user);
  const previewAccess = usePreviewAccess(user);
  const allOpen = teacherOnScreen || previewAccess === 'full' || enrollment?.access === 'full';
  const selfCheck = useSelfCheck();
  const tick = useChecklistTick();
  return useMemo(() => {
    const state = readChecklistState(courseChoice, level, stats.completedTopics);
    const ratings = Object.fromEntries(
      chaptersOf(courseChoice).map(ch => {
        const p = chapterProgress(ch.topics, selfCheck, level);
        return [ch.id, { lo: p.lo, kw: p.kw }];
      })
    );
    return buildChecklist(courseChoice, level, state, ratings, allOpen);
    // tick: read again when the student finishes something
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseChoice, level, stats.completedTopics, selfCheck, allOpen, tick]);
};

// The student's own checklist of the programme, under My progress: every chapter, lesson, end-of-topic test and self-check,
// ticked by itself as the work is done, with what keeps the next lesson closed at the top
export const MyChecklist: React.FC = () => {
  const { mode } = useLanguage();
  const mn = mode !== 'en';
  const { jumpToTopic } = useApp();
  const checklist = useMyChecklist();

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <ListChecks className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">{mn ? 'Хийх ажлын хүснэгт' : 'My checklist'}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {mn
              ? 'Бүлэг бүрт юу хийх ёстой, юуг хийсэн бэ. Хийсэн ажил өөрөө ✓ болно.'
              : 'What each chapter asks of you, and what you have done. Each item ticks itself when done.'}
          </p>
        </div>
      </div>
      <ChapterChecklist checklist={checklist} mn={mn} onGo={ch => ch.firstTopicId && jumpToTopic(ch.firstTopicId)} />
    </section>
  );
};
