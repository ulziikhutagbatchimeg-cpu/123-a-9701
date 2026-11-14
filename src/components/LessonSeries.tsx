import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PROGRESS_RESTORED } from '../lib/progressRestore';
import { KEPT_RESTORED } from '../lib/accountCopy';
import { ConceptMapButton } from './ChapterConceptMap';
import { LabScoredContext, labDoneKey, markDone, missingBefore, practiceDoneKey, useDoneFlags, type GateItem } from '../lib/lessonGate';
import { LessonChecklist } from './LessonChecklist';
import { ChapterSelfCheck } from './SelfCheckList';
import { chapterProgress, useSelfCheck } from '../lib/selfCheck';
import { ALEVEL_CHAPTERS } from '../data/alevelCurriculum';
import { CONCEPT_MAPS } from '../data/conceptMaps';
import { Lock } from 'lucide-react';
import type { Bi, StatesLesson } from '../data/statesLessons';
import type { GlossaryTerm, PracticeItem } from '../data/statesLessonSupport';
import { cambridgeGrade } from '../lib/grade';
import { recordActivity } from '../lib/activity';
import { useApp } from '../context/AppContext';
import { lessonSlides, lessonStepParts, slideRangeLabel } from '../data/chapterSlides';
import { StatesGlossary } from './StatesGlossary';
import {
  Block,
  ExitTest,
  PracticeSet,
  PredictionBox,
  predictionKey,
  QuickCheck,
  QUICK_BLOCK,
  readPredictionDone,
  readQuickDone
} from './InteractiveChapterOne';
import { quickCheckFor } from '../lib/quickCheck';
import { StepSticker } from './StepSticker';
import { LessonCelebration } from './LessonCelebration';
import { CURRICULUM_CHAPTERS } from '../data/curriculumData';
import { useAuthUser } from '../lib/cloud';
import { useTeacherOnScreen } from '../lib/viewAs';
import { pinLesson } from '../lib/notebook';
import type { LabNext } from './LabFrame';
import { useStudyTime } from '../lib/studyTime';

// The lesson's code, for example Ch2 / L3: the chapter's number in the syllabus, then the lesson in that chapter
const lessonCode = (chapterId: string, lessonNumber: number): string => {
  const chapter = chapterId.startsWith('al-ch-')
    ? chapterId.slice('al-ch-'.length)
    : String(CURRICULUM_CHAPTERS.find(c => c.id === chapterId)?.number ?? '');
  return `Ch${chapter} / L${lessonNumber}`;
};

// A chapter taught as a series of 40-minute lessons, laid out as the IGCSE chapter 1 lessons: a lesson picker, exit-ticket
// tiles, the key words, five steps with their slides, the practice and the exit ticket. Used for every chapter with a deck.
const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4';
const HEADING = 'text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono';
export const UNLOCK_ABOVE = 60;

// An interactive shown inside one step of a lesson (for example the periodic-trends card in the radius step). A virtual lab
// is given how to move on: once it is submitted and scored, its "Next step" opens the lesson's next step.
export interface LessonWidget {
  step: number; // the 0-based step the widget sits in
  component: React.ComponentType<LabNext>;
  lab?: boolean; // false for a card that is not submitted and scored; a scored lab must be done before the steps after it
}

export interface LessonSeriesData {
  chapterId: string;
  eyebrow: Bi;
  title: Bi;
  storageKey: string; // where the exit-ticket scores are kept on this browser
  lessons: StatesLesson[];
  glossary: Record<string, GlossaryTerm[]>;
  practice: Record<string, PracticeItem[]>;
  widgets?: Record<string, LessonWidget | LessonWidget[]>; // keyed by lesson id; a lesson may have more than one
}

export const readScores = (key: string): Record<string, number> => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
};

const writeScores = (key: string, scores: Record<string, number>) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(scores));
  } catch {
    // Storage can be blocked; the scores then last only for this visit
  }
};

// level: a Core student sees the Core lessons only; an Extended student sees every lesson
// isOpen decides which lessons the student may open (the curriculum works out the course order); onNext moves the student on
// to the next chapter once the last lesson of this one is passed
export const LessonSeries: React.FC<{
  data: LessonSeriesData;
  mn: boolean;
  level?: 'core' | 'extended';
  isOpen?: (lessonId: string) => boolean;
  onNext?: () => void;
  // Full access (granted by the teacher) or the teacher's own account: every step of every lesson is open
  allOpen?: boolean;
}> = ({ data, mn, level = 'extended', isOpen, onNext, allOpen = false }) => {
  const { chapterId, eyebrow, title, storageKey, glossary, practice, widgets } = data;
  // Pinning a lesson to the student's notebook, on the account
  const { user: pinUser } = useAuthUser();
  const [pinned, setPinned] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [pinNote, setPinNote] = useState<string | null>(null);
  const lessons = data.lessons.filter(l => level === 'extended' || l.tier !== 'extended');
  const { courseChoice } = useApp();
  const [active, setActive] = useState(0);
  const [block, setBlock] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>(() => readScores(storageKey));
  // Scores read back from the student's account after sign-in (another device) are shown at once
  useEffect(() => {
    const again = () => setScores(readScores(storageKey));
    window.addEventListener(PROGRESS_RESTORED, again);
    return () => window.removeEventListener(PROGRESS_RESTORED, again);
  }, [storageKey]);
  // Counts the lessons passed in this view, so each pass shows the celebration once
  const [celebrate, setCelebrate] = useState(0);
  const stepTopRef = useRef<HTMLDivElement>(null);
  // The time with the lesson on show is counted for the teacher; this runs before the early return below
  useStudyTime({
    course: courseChoice,
    chapterId,
    lessonId: lessons[active]?.id ?? null,
    lessonTitle: lessons[active]?.title,
    enabled: lessons.length > 0
  });
  // The quick check of the lesson on show (step 3). The steps after it open once every question is answered, the same rule
  // as IGCSE chapter 1. The teacher, full-access students and lessons already passed keep every step open.
  const currentId = lessons[active]?.id ?? '';
  const quickItems = useMemo(
    () => (lessons[active] ? quickCheckFor(lessons[active], glossary) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentId]
  );
  const [quickDone, setQuickDone] = useState(() => readQuickDone(currentId, quickItems.length));
  // The steps after step 1 open once the prediction is written
  const [predictionDone, setPredictionDone] = useState(() => readPredictionDone(currentId));
  useEffect(() => {
    const read = () => {
      setQuickDone(readQuickDone(currentId, quickItems.length));
      setPredictionDone(readPredictionDone(currentId));
    };
    read();
    // The prediction and the quick check can come back from the student's account after sign-in
    window.addEventListener(KEPT_RESTORED, read);
    return () => window.removeEventListener(KEPT_RESTORED, read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);
  // The teacher's own view opens every step; looking at the site as a student (lib/viewAs) it does not
  const teacherAccount = useTeacherOnScreen(pinUser);
  const free = allOpen || teacherAccount || (scores[currentId] ?? -1) > UNLOCK_ABOVE;
  // The parts of the lesson to finish, in order: the prediction, each scored simulation, the quick check and the practice.
  // Each step opens once every part before it is done, and the exit ticket once all of them are. The teacher, full-access
  // students and lessons already passed keep every step open.
  const currentWidgets = ([] as LessonWidget[]).concat(widgets?.[currentId] ?? []);
  const labIndexes = currentWidgets.flatMap((w, k) => (w.lab === false ? [] : [k]));
  const practiceItems = practice[currentId] ?? [];
  const doneFlags = useDoneFlags([...labIndexes.map(k => labDoneKey(currentId, k)), practiceDoneKey(currentId)]);
  const selfCheck = useSelfCheck();
  const chapterTopics = (chapterId.startsWith('al-ch-') ? ALEVEL_CHAPTERS : CURRICULUM_CHAPTERS).find(c => c.id === chapterId)?.topics ?? [];
  const isLastLesson = lessons.length > 0 && active === lessons.length - 1;
  const selfCheckDone = chapterProgress(chapterTopics, selfCheck, level).complete;
  const gate: GateItem[] = [
    { id: 'prediction', step: 0, done: predictionDone, label: { mn: 'Таамаглалаа бичих (1-р алхам)', en: 'Write your prediction (step 1)' } },
    ...labIndexes.map(k => ({
      id: `lab-${k}`,
      step: currentWidgets[k].step,
      done: !!doneFlags[labDoneKey(currentId, k)],
      label: {
        mn: `Симуляцийг хийж «Илгээх» дарах (${currentWidgets[k].step + 1}-р алхам)`,
        en: `Do the simulation and press Submit (step ${currentWidgets[k].step + 1})`
      }
    })),
    ...(quickItems.length > 0
      ? [{ id: 'quick', step: QUICK_BLOCK, done: quickDone, label: { mn: 'Түргэн шалгалтын бүх асуултад хариулах (3-р алхам)', en: 'Answer every quick-check question (step 3)' } }]
      : []),
    ...(practiceItems.length > 0
      ? [{ id: 'practice', step: 3, done: !!doneFlags[practiceDoneKey(currentId)], label: { mn: 'Бие даах дасгалыг бүгдийг хийх (4-р алхам)', en: 'Do all the practice (step 4)' } }]
      : []),
    // The last lesson of the chapter also asks for the chapter's self-check: every objective and key word rated
    ...(isLastLesson && chapterTopics.length > 0
      ? [{ id: 'selfcheck', step: 4, done: selfCheckDone, label: { mn: 'Бүлгийн сурах зорилт, түлхүүр үгийг бүгдийг үнэлэх (5-р алхам)', en: 'Rate all the chapter’s objectives and key words (step 5)' } }]
      : [])
  ];
  const missing = (b: number) => (free ? undefined : missingBefore(gate, b));
  const stepLocked = (b: number) => !!missing(b);
  const lockReason = (b: number) => {
    const g = missing(b);
    return g ? (mn ? `Нээгдэхийн тулд: ${g.label.mn}` : `To open it: ${g.label.en}`) : '';
  };
  const exitOpen = free || gate.every(g => g.done);

  // Every lesson of this chapter is Extended and the student is on the Core track: nothing to show
  if (lessons.length === 0) return null;

  // A lesson opens after the one before it has an exit-ticket score above UNLOCK_ABOVE. The curriculum passes isOpen, which
  // applies the same rule on every programme (the teacher and full-access students see every lesson).
  const unlocked = (index: number) => {
    if (isOpen) return isOpen(lessons[index].id);
    return index === 0 || (scores[lessons[index - 1].id] ?? -1) > UNLOCK_ABOVE;
  };
  const lesson = lessons[active];
  const lessonWidgets = ([] as LessonWidget[]).concat(widgets?.[lesson.id] ?? []);
  // Each step shows the slides the lesson names for it; otherwise the lesson's slides are shared out over its steps
  // in proportion to the minutes of each step
  const stepMinutes = lesson.steps.map(s => s.to - s.from);
  const lessonParts = lessonSlides(chapterId, lesson.number);
  const stepParts =
    lesson.stepSlides && lessonParts.length > 0
      ? lesson.stepSlides.map(runs => runs.map(([from, to]) => ({ deck: lessonParts[0].deck, from, to })))
      : lessonStepParts(lessonParts, stepMinutes);
  // One line over a set of questions: the step and slides of the lesson they are about
  const aboutStep = (i: number, what: Bi): Bi => ({
    mn: `${what.mn} ${i + 1}-р алхам «${lesson.steps[i]?.title.mn ?? ''}»-ын агуулгаас (${slideRangeLabel(stepParts[i] ?? [], true)})`,
    en: `${what.en} step ${i + 1}, ${lesson.steps[i]?.title.en ?? ''} (${slideRangeLabel(stepParts[i] ?? [], false)})`
  });

  const chooseLesson = (index: number) => {
    if (!unlocked(index)) return;
    setActive(index);
    setBlock(0);
    setNotice(null);
  };

  const goBlock = (index: number) => {
    if (stepLocked(index)) return;
    setBlock(index);
    stepTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Records the exit-ticket score of this lesson, and says which lesson opened
  const submitExit = (percent: number) => {
    // The best score is kept, so taking a passed ticket again never closes the next lesson
    const next = { ...scores, [lesson.id]: Math.max(scores[lesson.id] ?? -1, percent) };
    setScores(next);
    writeScores(storageKey, next);
    recordActivity({
      kind: 'exit',
      course: courseChoice,
      percent,
      label: { en: lessonCode(chapterId, lesson.number), mn: lessonCode(chapterId, lesson.number) }
    });
    if (percent > UNLOCK_ABOVE) setCelebrate(c => c + 1);
    if (percent <= UNLOCK_ABOVE) return;
    const grade = cambridgeGrade(percent);
    if (active + 1 < lessons.length) {
      const following = lessons[active + 1].number;
      // The next lesson is open now, so the student moves on to it
      setActive(active + 1);
      setBlock(0);
      setNotice(
        mn
          ? `${lesson.number}-р хичээл: ${grade.num} (${grade.letter}). ${following}-р хичээл нээгдлээ.`
          : `Lesson ${lesson.number}: ${grade.num} (${grade.letter}). Lesson ${following} is open.`
      );
    } else {
      // The last lesson of this chapter: the first lesson of the next chapter is open now
      onNext?.();
      setNotice(mn ? `Бүх хичээлийг дуусгалаа: ${grade.num} (${grade.letter}).` : `All lessons completed: ${grade.num} (${grade.letter}).`);
    }
  };

  return (
    <div className="space-y-5">
      {celebrate > 0 && <LessonCelebration key={celebrate} mn={mn} />}
      <div className={CARD}>
        <div className="space-y-1">
          <div className={HEADING}>{mn ? eyebrow.mn : eyebrow.en}</div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{mn ? title.mn : title.en}</h2>
        </div>
        {/* At the start of the chapter, the concept map is its overview */}
        {CONCEPT_MAPS[chapterId] && <ConceptMapButton mn={mn} purpose="preview" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {lessons.map((l, i) => {
            const open = unlocked(i);
            // The lesson's own exit-ticket score sits under its title, so the score is read beside the lesson it belongs to
            const s = scores[l.id];
            const g = s === undefined ? null : cambridgeGrade(s);
            return (
              <button
                key={l.id}
                onClick={() => chooseLesson(i)}
                disabled={!open}
                aria-pressed={active === i}
                className={`flex items-start gap-2 px-2.5 py-2 rounded-xl border text-left transition-colors ${
                  active === i
                    ? 'bg-violet-600 text-white border-violet-600'
                    : open
                      ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-violet-500'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {!open && <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />}
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wide opacity-80">
                    {mn ? `Хичээл ${l.number}` : `Lesson ${l.number}`}
                  </span>
                  <span className="block text-[13px] font-bold leading-snug">{mn ? l.title.mn : l.title.en}</span>
                  <span
                    className={`block pt-0.5 font-mono text-[10px] font-bold ${
                      active === i
                        ? 'text-white/90'
                        : g
                          ? s > UNLOCK_ABOVE
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-300'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {g ? `${s}% · ${g.num} (${g.letter})` : mn ? 'Өгөөгүй' : 'Not yet'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          {mn
            ? `Гарах билетийн оноо ${UNLOCK_ABOVE}%-иас дээш бол дараагийн хичээл нээгдэнэ.`
            : `An exit-ticket score above ${UNLOCK_ABOVE}% opens the next lesson.`}
        </p>
        {notice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-sm font-bold text-emerald-900 dark:text-emerald-200">
            {notice}
          </div>
        )}
      </div>

      <div className={CARD}>
        <div className="space-y-1">
          <div className={HEADING}>{mn ? `Хичээл ${lesson.number}` : `Lesson ${lesson.number}`}</div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">{mn ? lesson.title.mn : lesson.title.en}</h3>
          <button
            type="button"
            disabled={pinning || pinned}
            onClick={async () => {
              if (!pinUser) {
                setPinNote(mn ? 'Дэвтэрт хадахын тулд нэвтэрнэ үү.' : 'Sign in to pin it to your notebook.');
                return;
              }
              setPinning(true);
              setPinNote(null);
              try {
                const code = lessonCode(chapterId, lesson.number);
                await pinLesson(pinUser.uid, code, mn ? `${lesson.number}-р хичээл · ${lesson.title.mn}` : `Lesson ${lesson.number} · ${lesson.title.en}`);
                setPinned(true);
              } catch {
                setPinNote(mn ? 'Дэвтэрт хадаж чадсангүй.' : 'Could not pin it.');
              } finally {
                setPinning(false);
              }
            }}
            className="print:hidden self-start px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            {pinned ? (mn ? 'Дэвтэрт хадсан' : 'Pinned to notebook') : mn ? 'Дэвтэрт хадах' : 'Pin to notebook'}
          </button>
          {pinNote && <p className="text-xs text-slate-600 dark:text-slate-300">{pinNote}</p>}
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{mn ? lesson.objective.mn : lesson.objective.en}</p>
        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {lesson.keyPoints.map((k, i) => (
            <li key={i}>• {mn ? k.mn : k.en}</li>
          ))}
        </ul>
      </div>

      <div ref={stepTopRef} className={CARD}>
        <div className={HEADING}>{mn ? 'Алхам' : 'Step'}</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {lesson.steps.map((s, i) => {
            const locked = stepLocked(i);
            return (
            <button
              key={i}
              onClick={() => goBlock(i)}
              disabled={locked}
              aria-pressed={block === i}
              title={locked ? lockReason(i) : undefined}
              className={`p-2.5 rounded-xl border text-left transition-colors ${
                block === i
                  ? 'bg-violet-600 text-white border-violet-600'
                  : locked
                    ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-500'
              }`}
            >
              <span className="flex items-start gap-2">
                <StepSticker step={i + 1} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-black">
                    {locked && <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
                    {i + 1} · {s.from}–{s.to} {mn ? 'мин' : 'min'}
                  </span>
                  <span className="block text-sm font-bold leading-snug">{mn ? s.title.mn : s.title.en}</span>
                  <span className="block text-xs font-mono opacity-80">{slideRangeLabel(stepParts[i], mn)}</span>
                </span>
              </span>
            </button>
            );
          })}
        </div>
      </div>

      {lesson.steps.map((s, i) => (
        <Block
          key={`${lesson.id}-${i}`}
          show={block === i}
          no={i + 1}
          from={s.from}
          to={s.to}
          title={s.title}
          steps={[s]}
          mn={mn}
          slides={stepParts[i]}
        >
          {lessonWidgets
            .map((w, k) => ({ w, k }))
            .filter(({ w }) => w.step === i)
            .map(({ w, k }) => {
              const last = i >= lesson.steps.length - 1;
              // A scored lab tells the lesson once it is submitted, so the steps after it open
              return (
                <LabScoredContext.Provider key={k} value={() => markDone(labDoneKey(lesson.id, k))}>
                  <w.component
                    onDone={!last && !stepLocked(i + 1) ? () => goBlock(i + 1) : undefined}
                    nextHint={!last && stepLocked(i + 1) ? lockReason(i + 1) : undefined}
                  />
                </LabScoredContext.Provider>
              );
            })}
          {i === 0 && (
            <PredictionBox
              key={lesson.id}
              mn={mn}
              storageKey={predictionKey(lesson.id)}
              gated={!free}
              onWrittenChange={setPredictionDone}
            />
          )}
          {/* A small quick check after the theory: the next steps open once every question is answered */}
          {i === QUICK_BLOCK && quickItems.length > 0 && (
            <div className="space-y-2">
              <div className={HEADING}>{mn ? 'Түргэн шалгалт (quick check)' : 'Quick check'}</div>
              <QuickCheck
                key={`${lesson.id}-qc`}
                items={quickItems}
                mn={mn}
                storageKey={`chem_quick_${lesson.id}`}
                resultLabel={lesson.title}
                onNext={() => goBlock(QUICK_BLOCK + 1)}
                onDoneChange={done => {
                  if (done) setQuickDone(true);
                }}
                about={aboutStep(QUICK_BLOCK, { mn: 'Энэ түргэн шалгалт', en: 'This quick check is on' })}
                glossary={glossary[lesson.id] ?? []}
              />
            </div>
          )}
          {i === 3 && (
            <div className="space-y-2">
              <div className={HEADING}>{mn ? 'Бие даах дасгал' : 'Practice'}</div>
              <PracticeSet
                key={lesson.id}
                items={practice[lesson.id] ?? []} storageKey={`chem_ls_practice_${lesson.id}`}
                mn={mn}
                label={{ en: `Lesson ${lesson.number} · ${lesson.title.en}`, mn: `${lesson.number}-р хичээл · ${lesson.title.mn}` }}
                doneKey={practiceDoneKey(lesson.id)}
                about={aboutStep(3, { mn: 'Энэ дасгал', en: 'This practice is on' })}
                glossary={glossary[lesson.id] ?? []}
              />
            </div>
          )}
          {i === 4 && (
            <div className="space-y-3">
              {/* Concluding the lesson: a review with the concept map, before the exit ticket */}
              {CONCEPT_MAPS[chapterId] && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span>{mn ? 'Дүгнэлт:' : 'To conclude:'}</span>
                  <ConceptMapButton mn={mn} purpose="review" />
                </div>
              )}
              {/* The chapter's last lesson: the self-check of every objective and key word, rated here */}
              {isLastLesson && !free && !selfCheckDone && chapterTopics.length > 0 && (
                <ChapterSelfCheck topics={chapterTopics} mn={mn} level={level} />
              )}
              <div className={HEADING}>{mn ? 'Гарах билет (үнэлгээ)' : 'Exit ticket (assessment)'}</div>
              {/* The exit ticket opens once every part of the lesson is done; until then, the list of what is left */}
              {exitOpen ? (
                <ExitTest
                  key={lesson.id}
                  items={lesson.quiz}
                  mn={mn}
                  onSubmit={submitExit}
                  storageKey={`chem_ls_exit_${lesson.id}`}
                  about={{
                    mn: `Гарах билет: энэ хичээлийн бүх алхмын агуулгаас (${lesson.number}-р хичээл «${lesson.title.mn}»)`,
                    en: `The exit ticket is on the whole lesson (lesson ${lesson.number}, ${lesson.title.en})`
                  }}
                  glossary={glossary[lesson.id] ?? []}
                />
              ) : (
                <LessonChecklist gate={gate} mn={mn} onGo={goBlock} />
              )}
            </div>
          )}
        </Block>
      ))}

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => goBlock(Math.max(0, block - 1))}
          disabled={block === 0}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
        >
          ← {mn ? 'Өмнөх алхам' : 'Previous step'}
        </button>
        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
          {block + 1} / {lesson.steps.length}
        </span>
        <button
          onClick={() => goBlock(Math.min(lesson.steps.length - 1, block + 1))}
          disabled={block === lesson.steps.length - 1 || stepLocked(block + 1)}
          className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-black"
        >
          {mn ? 'Дараагийн алхам' : 'Next step'} →
        </button>
      </div>
      {block < lesson.steps.length - 1 && stepLocked(block + 1) && (
        <p className="flex items-center justify-end gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-300">
          <Lock className="w-4 h-4" aria-hidden="true" />
          {mn ? 'Дараагийн алхам: ' : 'Next step: '}
          {lockReason(block + 1)}.
        </p>
      )}

      {/* The key words sit at the foot, folded, so the steps come first */}
      <details className={CARD}>
        <summary className={`${HEADING} cursor-pointer`}>{mn ? 'Түлхүүр үгийн сан (glossary)' : 'Key words glossary'}</summary>
        {(glossary[lesson.id] ?? []).length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mn ? 'Энэ хичээлийн түлхүүр үг одоогоор бэлтгэгдээгүй байна.' : 'Key words for this lesson are not written yet.'}
          </p>
        ) : (
          <StatesGlossary key={lesson.id} items={glossary[lesson.id]} mn={mn} />
        )}
      </details>
    </div>
  );
};
