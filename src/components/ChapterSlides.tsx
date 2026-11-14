import React, { useState } from 'react';
import { CHAPTER_SLIDES, courseOf, deckTitle, type SlideDeck } from '../data/chapterSlides';
import { getDeckUrl, isTeacher, signInTeacher, signOutUser, uploadDeck, useAuthUser } from '../lib/cloud';
import { useTeacherOnScreen } from '../lib/viewAs';
import { isFirebaseConfigured } from '../lib/firebase';
import { SlideViewer } from './SlideViewer';
import { printDeck, printDecks } from '../lib/slidePrint';

// The PowerPoint decks of the current chapter. The slides open once the student may see the lessons (an approved enrollment,
// or the teacher's account). A lesson's slides open once its exit ticket is passed (above 60%); the whole slide show opens
// once every lesson of the deck is passed. The teacher sees everything. The pictures are readable only when signed in.
// The teacher account can download the .pptx from Firebase Storage and upload new ones. Students never get a .pptx link.

const DeckRow: React.FC<{
  deck: SlideDeck;
  mn: boolean;
  teacher: boolean;
  signedIn: boolean;
  viewable: boolean;
  fullOpen: boolean;
  lessonPassed: (lessonNumber: number) => boolean;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onPrintNotebook: () => void;
  canPrint: boolean;
}> = ({ deck, mn, teacher, signedIn, viewable, fullOpen, lessonPassed, open, busy, onToggle, onDownload, onPrint, onPrintNotebook, canPrint }) => {
  // The lesson whose slides are on show, as its slide range
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);

  return (
    <li className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-[11px] font-black text-violet-800 dark:text-violet-200">
            {deck.deckNo}
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{deckTitle(deck, mn)}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{mn ? `${deck.slides} слайд` : `${deck.slides} slides`}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!viewable ? (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {signedIn
                ? mn
                  ? 'Элсэлт зөвшөөрөгдсөний дараа нээгдэнэ'
                  : 'Opens once your enrollment is approved'
                : mn
                  ? 'Үзэхийн тулд нэвтэрнэ үү'
                  : 'Sign in to view'}
            </span>
          ) : fullOpen ? (
            <button onClick={onToggle} className="text-xs font-bold text-violet-700 dark:text-violet-300 hover:underline">
              {open ? (mn ? 'Slide show хаах' : 'Close slide show') : mn ? 'Slide show үзэх' : 'Open slide show'}
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {mn ? 'Бүх хичээлийн гарах билетэд 60%-иас дээш оноо авсны дараа нээгдэнэ' : 'Opens once every lesson’s exit ticket is above 60%'}
            </span>
          )}
          {viewable && fullOpen && canPrint && (
            <button onClick={onPrint} className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline">
              {mn ? 'Хэвлэх / PDF хадгалах' : 'Print / save as PDF'}
            </button>
          )}
          {viewable && fullOpen && canPrint && (
            <button onClick={onPrintNotebook} className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline">
              {mn ? 'Дэвтэрт хэвлэх (мөртэй)' : 'Print as notebook (with lines)'}
            </button>
          )}
          {teacher && (
            <button
              onClick={onDownload}
              disabled={busy}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline disabled:opacity-50"
            >
              {busy ? (mn ? 'Нээж байна…' : 'Opening…') : mn ? 'Татах (.pptx, засах боломжтой)' : 'Download (.pptx, editable)'}
            </button>
          )}
        </div>
      </div>
      {deck.lessonSlides && (
        <div className="flex flex-wrap gap-1.5">
          {deck.lessonSlides.map(l => {
            const label = mn ? `Хичээл ${l.lesson}: слайд ${l.from}–${l.to}` : `Lesson ${l.lesson}: slides ${l.from}–${l.to}`;
            const chipCls =
              'px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300';
            return viewable && lessonPassed(l.lesson) ? (
              <button
                key={l.lesson}
                type="button"
                onClick={() => setRange({ from: l.from, to: l.to })}
                className={`${chipCls} hover:bg-emerald-50 dark:hover:bg-emerald-950/40`}
              >
                {label}
              </button>
            ) : (
              <span
                key={l.lesson}
                title={mn ? 'Гарах билетэд 60%-иас дээш оноо авсны дараа нээгдэнэ' : 'Opens after an exit-ticket score above 60%'}
                className={`${chipCls} opacity-50`}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
      {open && viewable && fullOpen && <SlideViewer parts={[{ deck, from: 1, to: deck.slides }]} mn={mn} onClose={onToggle} />}
      {range && viewable && (
        <SlideViewer parts={[{ deck, from: range.from, to: range.to }]} mn={mn} onClose={() => setRange(null)} />
      )}
    </li>
  );
};

export const ChapterSlides: React.FC<{
  chapterId: string;
  mn: boolean;
  unlocked?: boolean;
  lessonPassed?: (lessonNumber: number) => boolean;
  // The teacher lets this student print or save this chapter's slides as PDF
  printApproved?: boolean;
}> = ({ chapterId, mn, unlocked, lessonPassed, printApproved }) => {
  const { user, ready } = useAuthUser();
  // The teacher's own view; looking at the site as a student (lib/viewAs), the slides open and print as for a student
  const teacher = useTeacherOnScreen(user);
  // Printing and saving as PDF: the teacher always, a student only once the teacher has allowed this chapter
  const canPrint = teacher || !!printApproved;
  // The slides open when the curriculum says the student may see the lessons; without that, any signed-in user may see them
  const viewable = unlocked ?? !!user;
  // Without the prop every lesson counts as passed
  const passed = lessonPassed ?? (() => true);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const decks = CHAPTER_SLIDES[chapterId];
  if (!decks) return null;
  // All decks of one chapter belong to the same course, which is the folder used in Firebase Storage
  const course = courseOf(decks[0]);
  // The whole slide show of a deck opens for the teacher, or once every lesson in it is passed
  const fullOpenFor = (deck: SlideDeck) => teacher || (deck.lessonSlides ?? []).every(l => passed(l.lesson));

  // Signs in with Google and checks the account. Any other account is signed out again.
  const signIn = async () => {
    setSigning(true);
    setNote(null);
    try {
      const result = await signInTeacher();
      if (!isTeacher(result.user)) {
        await signOutUser();
        setNote(mn ? 'Энэ данс багшийн данс биш байна.' : 'This is not the teacher account.');
      }
    } catch {
      setNote(mn ? 'Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.' : 'Sign-in failed. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  // Opens the .pptx from Firebase Storage. The rules refuse it for anyone but the teacher.
  const download = async (file: string) => {
    setBusyFile(file);
    setNote(null);
    try {
      const url = await getDeckUrl(course, file);
      window.open(url, '_blank', 'noopener');
    } catch {
      setNote(mn ? `${file} файл Storage-д байхгүй байна. Эхлээд байршуулна уу.` : `${file} is not in Storage yet. Upload it first.`);
    } finally {
      setBusyFile(null);
    }
  };

  // Prints or saves as PDF every deck of the chapter, in order, once the student has finished its lessons
  const printAll = (notebook: boolean) => {
    if (!printDecks(decks, mn, notebook)) {
      setNote(mn ? 'Хэвлэх цонх нээгдсэнгүй. Энэ сайтад popup-ийг зөвшөөрнө үү.' : 'The print window did not open. Allow pop-ups for this site.');
    }
  };

  // Uploads the .pptx files the teacher picks (from the decks folder on this computer) to Firebase Storage
  const onPick = async (files: FileList | null, input: HTMLInputElement) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setNote(null);
    let done = 0;
    try {
      for (const f of Array.from(files)) {
        await uploadDeck(course, f);
        done += 1;
      }
      setNote(mn ? `${done} файл байршуулсан.` : `Uploaded ${done} file(s).`);
    } catch {
      setNote(mn ? 'Байршуулахад алдаа гарлаа. Storage-ийн дүрэм, эрхээ шалгана уу.' : 'Upload failed. Check the Storage rules and access.');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          {mn ? 'PowerPoint слайд' : 'PowerPoint slides'}
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          {mn
            ? 'Слайдууд англи хэлээр бэлтгэгдсэн. Slide show-оор дараалан үзнэ.'
            : 'The slides are in English. Watch them in order as a slide show.'}
        </p>
        {viewable && decks.every(fullOpenFor) && !canPrint && (
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {mn
              ? 'Бүлгийн хичээлийг дуусгасан. PDF-ээр татах, хэвлэхийг багш зөвшөөрсний дараа боломжтой болно.'
              : 'You have finished this chapter. Printing and saving as PDF opens once your teacher allows it.'}
          </p>
        )}
        {viewable && decks.every(fullOpenFor) && canPrint && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
            <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
              {mn
                ? 'Бүлгийн бүх хичээлийг дуусгасан тул бүх слайдыг татаж хэвлэж болно:'
                : 'All lessons of this chapter are done, so you can print or save all its slides:'}
            </span>
            <button
              type="button"
              onClick={() => printAll(false)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black"
            >
              {mn ? 'Бүлгийг хэвлэх / PDF' : 'Print / save chapter as PDF'}
            </button>
            <button
              type="button"
              onClick={() => printAll(true)}
              className="px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-800 dark:text-emerald-200 text-[11px] font-black"
            >
              {mn ? 'Бүлгийг дэвтэрт хэвлэх / PDF' : 'Chapter as notebook PDF'}
            </button>
          </div>
        )}
        {teacher ? (
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            <span>
              {mn
                ? 'Багшийн данс: .pptx-ийг татаж засна, шинэ файлыг байршуулна. Засварын дараа scripts/render-slides.ps1-ээр зургийг гаргаад, тухайн папкийг байршуулна.'
                : 'Teacher account: download a .pptx to edit, upload new versions. After editing, run scripts/render-slides.ps1 and upload the picture folder.'}
            </span>
            <label className="px-2.5 py-1 rounded-lg border border-emerald-400 dark:border-emerald-700 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
              {uploading ? (mn ? 'Байршуулж байна…' : 'Uploading…') : mn ? 'Файл байршуулах (.pptx)' : 'Upload .pptx files'}
              <input
                type="file"
                accept=".pptx"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={e => onPick(e.target.files, e.target)}
              />
            </label>
            <button
              onClick={() => signOutUser().catch(() => undefined)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              {mn ? 'Гарах' : 'Sign out'}
            </button>
          </div>
        ) : (
          ready &&
          isFirebaseConfigured &&
          !viewable && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                {user
                  ? mn
                    ? 'Слайд таны элсэлт зөвшөөрөгдсөний дараа нээгдэнэ.'
                    : 'The slides open once your enrollment is approved.'
                  : mn
                    ? 'Слайдыг сурагчийн дансаар нэвтэрсний дараа үзнэ. Татах боломж зөвхөн багшид байна.'
                    : 'Sign in to view the slides. Only the teacher can download them.'}
              </span>
              {!user && (
                <button
                  onClick={signIn}
                  disabled={signing}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[11px] font-black"
                >
                  {mn ? 'Багшийн дансаар нэвтрэх' : 'Sign in as teacher'}
                </button>
              )}
            </div>
          )
        )}
        {/* A student sees the rule in words: the slides are read in the slide show, and only the teacher can download them */}
        {!teacher && ready && viewable && (
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {mn
              ? 'Слайдыг slide show-оор дараалан үзнэ. Слайдыг татах боломж зөвхөн багшид байна.'
              : 'Read the slides in order in the slide show. Only the teacher can download them.'}
          </p>
        )}
        {note && <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{note}</p>}
      </div>
      <ul className="space-y-2">
        {decks.map(deck => (
          <DeckRow
            key={deck.file}
            deck={deck}
            mn={mn}
            teacher={teacher}
            canPrint={canPrint}
            signedIn={!!user}
            viewable={viewable}
            fullOpen={fullOpenFor(deck)}
            lessonPassed={passed}
            open={openFile === deck.file}
            busy={busyFile === deck.file}
            onToggle={() => setOpenFile(prev => (prev === deck.file ? null : deck.file))}
            onDownload={() => download(deck.file)}
            onPrint={() => {
              if (!printDeck(deck, mn)) {
                setNote(mn ? 'Хэвлэх цонх нээгдсэнгүй. Энэ сайтад popup-ийг зөвшөөрнө үү.' : 'The print window did not open. Allow pop-ups for this site.');
              }
            }}
            onPrintNotebook={() => {
              if (!printDeck(deck, mn, true)) {
                setNote(mn ? 'Хэвлэх цонх нээгдсэнгүй. Энэ сайтад popup-ийг зөвшөөрнө үү.' : 'The print window did not open. Allow pop-ups for this site.');
              }
            }}
          />
        ))}
      </ul>
    </section>
  );
};
