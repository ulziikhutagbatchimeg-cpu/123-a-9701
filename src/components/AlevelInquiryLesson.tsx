import React, { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuthUser } from '../lib/cloud';
import { useTeacherOnScreen } from '../lib/viewAs';
import { KEPT_RESTORED } from '../lib/accountCopy';
import { missingBefore, practiceDoneKey, termsIn, useDoneFlags, type GateItem } from '../lib/lessonGate';
import { AboutLine, LessonChecklist, TermChips } from './LessonChecklist';
import type { GlossaryTerm } from '../data/statesLessonSupport';
import { ChapterSelfCheck } from './SelfCheckList';
import { chapterProgress, useSelfCheck } from '../lib/selfCheck';
import { ALEVEL_CHAPTERS } from '../data/alevelCurriculum';
import type { AlevelInquiryPlan } from '../data/alevelInquiryTypes';
import { StepSticker } from './StepSticker';
import type { Bi, QuizItem } from '../data/statesLessons';
import { cambridgeGrade } from '../lib/grade';
import { recordActivity } from '../lib/activity';
import { useApp } from '../context/AppContext';
import { PracticeSet, PredictionBox, readPredictionDone, StructuredQuestion } from './InteractiveChapterOne';
import { useKeptAnswers } from '../lib/keptAnswers';
import { lessonSlides, lessonStepParts, partsKey, slideRangeLabel, type SlidePart } from '../data/chapterSlides';
import { SlideViewer } from './SlideViewer';
import { KeyTermTracker } from './KeyTermTracker';
import { StatesGlossary } from './StatesGlossary';
import { ALEVEL_GLOSSARY } from '../data/alevelGlossary';
import { ConceptMapButton } from './ChapterConceptMap';
import { CONCEPT_MAPS } from '../data/conceptMaps';

// The 40-minute inquiry lesson of one AS & A Level 9701 chapter, with the same five steps as the IGCSE chapter 1
// lessons. Only the open step is shown. The exit ticket is submitted for a Cambridge-style grade.

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4';
const HEADING = 'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono';
const SCORE_KEY = 'alevel-inquiry-scores';

const STEPS: Array<{ from: number; to: number; title: Bi; prompt: Bi }> = [
  {
    from: 0,
    to: 5,
    title: { mn: 'Асуулт, таамаглал', en: 'Question and prediction' },
    prompt: { mn: 'Асуултыг уншаад таамаглал, шалтгаан хамт бичнэ.', en: 'Read the question. Write a prediction with a reason.' }
  },
  {
    from: 5,
    to: 15,
    title: { mn: 'Туршилт', en: 'Test' },
    prompt: { mn: 'Нэг хувьсагчийг өөрчилж, бусдыг тогтмол байлгана.', en: 'Change one variable and keep the others the same.' }
  },
  {
    from: 15,
    to: 25,
    title: { mn: 'Тайлбар', en: 'Explain' },
    prompt: { mn: 'Үр дүнг өөрийн үгээр, гол санаануудтай холбож тайлбарлана.', en: 'Explain the result in your own words, linking it to the key points.' }
  },
  {
    from: 25,
    to: 34,
    title: { mn: 'Хэрэглэх, шалгах', en: 'Apply and check' },
    prompt: { mn: 'Бүтэцтэй хариулт бичиж, хүндрэлийн түвшингээр дасгал хийнэ.', en: 'Write the structured answer, then do the practice by difficulty.' }
  },
  {
    from: 34,
    to: 40,
    title: { mn: 'Дүгнэлт, хязгаар', en: 'Conclude and evaluate' },
    prompt: { mn: 'Загварын хязгаарыг тодорхойлоод гарах билетээ илгээнэ.', en: 'State the limit of the model, then submit the exit ticket.' }
  }
];

const readScores = (): Record<string, number> => {
  try {
    const raw = window.localStorage.getItem(SCORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
};

const writeScores = (scores: Record<string, number>) => {
  try {
    window.localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  } catch {
    // Storage can be blocked; the grade then lasts only for this visit
  }
};

// The exit ticket: every question is answered, then Submit gives the percentage and the Cambridge grade
const ExitTest: React.FC<{
  items: QuizItem[];
  mn: boolean;
  onSubmit: (percent: number) => void;
  storageKey?: string;
  about?: Bi;
  glossary?: GlossaryTerm[];
}> = ({ items, mn, onSubmit, storageKey, about, glossary = [] }) => {
  const [picked, setPicked] = useState<Record<number, number | undefined>>({});
  const [submitted, setSubmitted] = useState(false);
  // The answers come back on this page, and on the student's account when signed in
  useKeptAnswers(storageKey ?? 'exit_unsaved', { picked, submitted }, saved => {
    setPicked(saved.picked);
    setSubmitted(saved.submitted);
  });
  const score = items.filter((q, i) => picked[i] === q.answer).length;
  const answered = items.filter((_, i) => picked[i] !== undefined).length;
  const complete = items.length > 0 && answered === items.length;
  const percent = items.length > 0 ? Math.round((score / items.length) * 100) : 0;
  const grade = cambridgeGrade(percent);

  const submit = () => {
    setSubmitted(true);
    onSubmit(percent);
  };

  const retry = () => {
    setPicked({});
    setSubmitted(false);
  };

  return (
    <div className="space-y-4">
      {about && <AboutLine text={about} mn={mn} />}
      {items.map((q, i) => {
        const choice = picked[i];
        return (
          <div key={i} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {i + 1}. {mn ? q.question.mn : q.question.en}
            </div>
            <TermChips terms={termsIn([q.question, q.options[q.answer], q.explanation], glossary)} mn={mn} />
            <div className="grid grid-cols-1 gap-1.5">
              {q.options.map((opt, j) => {
                const isRight = submitted && j === q.answer;
                const isWrong = submitted && j === choice && j !== q.answer;
                const isChosen = !submitted && j === choice;
                return (
                  <button
                    key={j}
                    disabled={submitted}
                    onClick={() => setPicked(prev => ({ ...prev, [i]: j }))}
                    aria-pressed={isChosen}
                    className={`text-left px-3 py-2 rounded-xl border text-xs transition-colors ${
                      isRight
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isWrong
                          ? 'bg-rose-600 text-white border-rose-600'
                          : isChosen
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-500'
                    }`}
                  >
                    {mn ? opt.mn : opt.en}
                  </button>
                );
              })}
            </div>
            {submitted && <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{mn ? q.explanation.mn : q.explanation.en}</p>}
          </div>
        );
      })}

      {!submitted ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {mn ? `Хариулсан: ${answered} / ${items.length}` : `Answered: ${answered} / ${items.length}`}
          </span>
          <button
            onClick={submit}
            disabled={!complete}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-black"
          >
            {mn ? 'Илгээх (Submit)' : 'Submit'}
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 space-y-2">
          <div className="text-sm font-black text-slate-900 dark:text-white">
            {mn ? 'Үнэлгээ' : 'Grade'}: {grade.num} ({grade.letter}) · {percent}% · {score} / {items.length}
          </div>
          <button onClick={retry} className="px-3 py-1.5 rounded-xl border border-violet-400 text-xs font-black text-violet-800 dark:text-violet-200">
            {mn ? 'Дахин оролдох' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
};

// One step of the lesson. It is kept mounted when it is not the open step, so what the student typed is kept.
const Step: React.FC<{ index: number; active: number; mn: boolean; slides: SlidePart[]; children: React.ReactNode }> = ({
  index,
  active,
  mn,
  slides,
  children
}) => {
  const s = STEPS[index];
  return (
    <section className={active === index ? CARD : 'hidden'}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <StepSticker step={index + 1} />
          <div className={HEADING}>
            {index + 1} · {mn ? s.title.mn : s.title.en} · {s.from}–{s.to} {mn ? 'мин' : 'min'}
          </div>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
          {mn ? 'Багшийн асуулт: ' : 'Teacher prompt: '}
          {mn ? s.prompt.mn : s.prompt.en}
        </p>
      </div>
      {/* The slides of this step sit in front of its content, so the student watches them while they work */}
      {slides.length > 0 && <SlideViewer key={partsKey(slides)} parts={slides} mn={mn} />}
      {children}
    </section>
  );
};

export const AlevelInquiryLesson: React.FC<{ plan: AlevelInquiryPlan; chapterId: string; chapterTitle: Bi; mn: boolean; allOpen?: boolean }> = ({
  plan,
  chapterId,
  chapterTitle,
  mn,
  allOpen = false
}) => {
  const [step, setStep] = useState(0);
  const { courseChoice } = useApp();
  const [scores, setScores] = useState<Record<string, number>>(readScores);
  // The glossary is the key terms of the chapter with their definitions, the same form as the 0620 glossary
  const glossary = ALEVEL_GLOSSARY[chapterId] ?? plan.glossary;
  // A 9701 chapter's decks are its whole lesson, so the lesson number is not needed; the slides are shared out over the steps
  const stepParts = lessonStepParts(lessonSlides(chapterId, 1));
  const stepTopRef = useRef<HTMLDivElement>(null);

  // The parts to finish, in order: the prediction (step 1), then the practice (step 4). Each step opens once every part
  // before it is done, and the exit ticket once both are. The teacher, full-access students and a passed chapter keep every
  // step open.
  const lessonKey = `alevel_${chapterId}`;
  const { user } = useAuthUser();
  const [predictionDone, setPredictionDone] = useState(() => readPredictionDone(lessonKey));
  useEffect(() => {
    const read = () => setPredictionDone(readPredictionDone(lessonKey));
    read();
    window.addEventListener(KEPT_RESTORED, read);
    return () => window.removeEventListener(KEPT_RESTORED, read);
  }, [lessonKey]);
  const doneFlags = useDoneFlags([practiceDoneKey(lessonKey)]);
  // A 9701 chapter is one inquiry lesson, so its exit ticket also asks for the chapter's self-check
  const selfCheck = useSelfCheck();
  const chapterTopics = ALEVEL_CHAPTERS.find(c => c.id === chapterId)?.topics ?? [];
  const selfCheckDone = chapterProgress(chapterTopics, selfCheck).complete;
  // The teacher's own view opens every step; looking at the site as a student (lib/viewAs) it does not
  const teacherOnScreen = useTeacherOnScreen(user);
  const free = allOpen || teacherOnScreen || (scores[chapterId] ?? -1) > 60;
  const gate: GateItem[] = [
    { id: 'prediction', step: 0, done: predictionDone, label: { mn: 'Таамаглалаа бичих (1-р алхам)', en: 'Write your prediction (step 1)' } },
    ...(plan.practice.length > 0
      ? [{ id: 'practice', step: 3, done: !!doneFlags[practiceDoneKey(lessonKey)], label: { mn: 'Бие даах дасгалыг бүгдийг хийх (4-р алхам)', en: 'Do all the practice (step 4)' } }]
      : []),
    ...(chapterTopics.length > 0
      ? [{ id: 'selfcheck', step: 4, done: selfCheckDone, label: { mn: 'Бүлгийн сурах зорилт, түлхүүр үгийг бүгдийг үнэлэх (5-р алхам)', en: 'Rate all the chapter’s objectives and key words (step 5)' } }]
      : [])
  ];
  const missing = (b: number) => (free ? undefined : missingBefore(gate, b));
  const lockReason = (b: number) => {
    const g = missing(b);
    return g ? (mn ? `Нээгдэхийн тулд: ${g.label.mn}` : `To open it: ${g.label.en}`) : '';
  };
  const exitOpen = free || gate.every(g => g.done);
  const aboutStep = (i: number, what: Bi): Bi => ({
    mn: `${what.mn} ${i + 1}-р алхам «${STEPS[i].title.mn}»-ын агуулгаас (${slideRangeLabel(stepParts[i] ?? [], true)})`,
    en: `${what.en} step ${i + 1}, ${STEPS[i].title.en} (${slideRangeLabel(stepParts[i] ?? [], false)})`
  });

  // Moves to the next or previous step and brings the step list into view, so the new step's slides show from the top.
  // A step whose parts before it are not done yet stays closed.
  const goStep = (s: number) => {
    if (missing(s)) return;
    setStep(s);
    stepTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Records the exit-ticket percentage for this chapter, for the grade shown in the header
  const submitExit = (percent: number) => {
    // The best score is kept, so taking a passed ticket again never closes the next lesson
    const next = { ...scores, [chapterId]: Math.max(scores[chapterId] ?? -1, percent) };
    setScores(next);
    writeScores(next);
    // A 9701 chapter is one lesson, so its code has lesson 1, for example Ch3 / L1
    const code = `Ch${chapterId.replace('al-ch-', '')} / L1`;
    recordActivity({ kind: 'exit', course: courseChoice, percent, label: { en: code, mn: code } });
  };

  const score = scores[chapterId];
  const grade = score === undefined ? null : cambridgeGrade(score);
  const chapterNumber = chapterId.replace('al-ch-', '');
  // The exit-ticket tile takes the colour of its score, as the IGCSE lesson tiles do
  const tone = score === undefined
    ? 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
    : score > 60
      ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
      : 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300';

  return (
    <div className="relative space-y-5">
      <div className={CARD}>
        <div className="space-y-1">
          <div className={HEADING}>
            {courseChoice === 'as' ? 'AS 9701' : 'A Level 9701'} · {mn ? `Бүлэг ${chapterNumber}` : `Chapter ${chapterNumber}`} · {mn ? 'Судалгааны хичээл, 40 минут' : 'Inquiry lesson, 40 minutes'}
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{mn ? chapterTitle.mn : chapterTitle.en}</h2>
        </div>
        {/* At the start of the chapter, the concept map is its overview */}
        {CONCEPT_MAPS[chapterId] && <ConceptMapButton mn={mn} purpose="preview" />}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {mn ? 'Гарах билетийн оноо энэ бүлгийн дүнг харуулна.' : 'The exit-ticket score shows the grade for this chapter.'}
          </p>
          <div className={`max-w-xs p-2.5 rounded-xl border ${tone}`}>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">
              {mn ? 'Гарах билет' : 'Exit ticket'}
            </div>
            <div className="text-sm font-black">{score !== undefined ? `${score}%` : '—'}</div>
            <div className="text-[11px] font-bold">{grade ? `${grade.num} (${grade.letter})` : mn ? 'Өгөөгүй' : 'Not yet'}</div>
          </div>
        </div>
      </div>

      <div className={CARD}>
        <div className={HEADING}>{mn ? 'Түлхүүр үгийн сан (glossary)' : 'Key words glossary'}</div>
        {glossary.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mn ? 'Энэ бүлгийн түлхүүр үг одоогоор бэлтгэгдээгүй байна.' : 'Key words for this chapter are not written yet.'}
          </p>
        ) : (
          <StatesGlossary key={chapterId} items={glossary} mn={mn} />
        )}
      </div>

      {/* The key terms of the chapter as a checklist, so the student can see what is still to master */}
      <KeyTermTracker chapterId={chapterId} mn={mn} />

      <div ref={stepTopRef} className={CARD}>
        <div className={HEADING}>{mn ? 'Алхам' : 'Step'}</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STEPS.map((s, i) => {
            const locked = !!missing(i);
            return (
            <button
              key={i}
              onClick={() => goStep(i)}
              disabled={locked}
              title={locked ? lockReason(i) : undefined}
              aria-pressed={step === i}
              className={`p-2.5 rounded-xl border text-left transition-colors ${
                step === i
                  ? 'bg-violet-600 text-white border-violet-600'
                  : locked
                    ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-500'
              }`}
            >
              <span className="flex items-start gap-2">
                <StepSticker step={i + 1} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[11px] font-black">
                    {locked && <Lock className="w-3 h-3" aria-hidden="true" />}
                    {i + 1} · {s.from}–{s.to} {mn ? 'мин' : 'min'}
                  </span>
                  <span className="block text-[11px] font-bold leading-snug">{mn ? s.title.mn : s.title.en}</span>
                  <span className="block text-[10px] font-mono opacity-80">{slideRangeLabel(stepParts[i], mn)}</span>
                </span>
              </span>
            </button>
            );
          })}
        </div>
      </div>

      <Step index={0} active={step} mn={mn} slides={stepParts[0]}>
        <div className="p-3.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-sm font-bold text-violet-900 dark:text-violet-200">
          {mn ? plan.question.mn : plan.question.en}
        </div>
        <PredictionBox
          key={chapterId}
          mn={mn}
          storageKey={`chem_prediction_alevel_${chapterId}`}
          gated={!free}
          onWrittenChange={setPredictionDone}
        />
      </Step>

      <Step index={1} active={step} mn={mn} slides={stepParts[1]}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: mn ? 'Өөрчлөх хувьсагч' : 'Change (independent)', value: plan.independent },
            { label: mn ? 'Ажиглах хувьсагч' : 'Measure (dependent)', value: plan.dependent },
            { label: mn ? 'Тогтмол байлгах' : 'Keep the same (controlled)', value: plan.controlled }
          ].map(v => (
            <div key={v.label} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">{v.label}</div>
              <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">{mn ? v.value.mn : v.value.en}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          {mn
            ? 'Туршилтын дүрсийг дээрх слайд show-оос (click бүрээр) үзнэ.'
            : 'Watch the test in the slide show above, one click at a time.'}
        </p>
      </Step>

      <Step index={2} active={step} mn={mn} slides={stepParts[2]}>
        <ul className="space-y-1.5">
          {plan.keyPoints.map((kp, i) => (
            <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              • {mn ? kp.mn : kp.en}
            </li>
          ))}
        </ul>
      </Step>

      <Step index={3} active={step} mn={mn} slides={stepParts[3]}>
        <div className="space-y-2">
          <div className={HEADING}>{mn ? 'Шалгалтын хэв маягийн асуулт' : 'Exam-style question'}</div>
          <StructuredQuestion key={chapterId} item={plan.structured} mn={mn} />
        </div>
        <div className="space-y-2">
          <div className={HEADING}>{mn ? 'Бие даан ажиллах дасгал (хүндрэлийн түвшингээр)' : 'Independent practice (by difficulty)'}</div>
          <PracticeSet
            key={chapterId}
            items={plan.practice}
            mn={mn}
            label={chapterTitle}
            storageKey={`chem_alevel_practice_${chapterId}`}
            doneKey={practiceDoneKey(lessonKey)}
            about={aboutStep(3, { mn: 'Энэ дасгал', en: 'This practice is on' })}
            glossary={glossary}
          />
        </div>
      </Step>

      <Step index={4} active={step} mn={mn} slides={stepParts[4]}>
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-black">{mn ? 'Загварын хязгаар: ' : 'Limit of the model: '}</span>
          {mn ? plan.limitation.mn : plan.limitation.en}
        </div>
        {/* Concluding the lesson: a review with the concept map, before the exit ticket */}
        {CONCEPT_MAPS[chapterId] && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>{mn ? 'Дүгнэлт:' : 'To conclude:'}</span>
            <ConceptMapButton mn={mn} purpose="review" />
          </div>
        )}
        {/* The chapter's self-check of every objective and key term, rated here */}
        {!free && !selfCheckDone && chapterTopics.length > 0 && <ChapterSelfCheck topics={chapterTopics} mn={mn} />}
        <div className="space-y-2">
          <div className={HEADING}>{mn ? 'Гарах билет (үнэлгээ)' : 'Exit ticket (assessment)'}</div>
          {/* The exit ticket opens once every part of the lesson is done; until then, the list of what is left */}
          {exitOpen ? (
            <ExitTest
              key={chapterId}
              items={plan.exit}
              mn={mn}
              onSubmit={submitExit}
              storageKey={`chem_alevel_exit_${chapterId}`}
              about={{
                mn: `Гарах билет: энэ бүлгийн хичээлийн бүх алхмын агуулгаас («${chapterTitle.mn}»)`,
                en: `The exit ticket is on the whole lesson of this chapter (${chapterTitle.en})`
              }}
              glossary={glossary}
            />
          ) : (
            <LessonChecklist gate={gate} mn={mn} onGo={goStep} />
          )}
        </div>
      </Step>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => goStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
        >
          ← {mn ? 'Өмнөх алхам' : 'Previous step'}
        </button>
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {step + 1} / {STEPS.length}
        </span>
        <button
          onClick={() => goStep(Math.min(STEPS.length - 1, step + 1))}
          disabled={step === STEPS.length - 1 || !!missing(step + 1)}
          title={missing(step + 1) ? lockReason(step + 1) : undefined}
          className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-black"
        >
          {mn ? 'Дараагийн алхам' : 'Next step'} →
        </button>
      </div>
      {step < STEPS.length - 1 && missing(step + 1) && (
        <p className="text-right text-xs font-bold text-amber-700 dark:text-amber-300">{lockReason(step + 1)}</p>
      )}
    </div>
  );
};
