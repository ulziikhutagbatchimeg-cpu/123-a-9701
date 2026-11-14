import { useEffect, useState } from 'react';
import { isTeacher } from './cloud';

// The teacher's account can look at the site as a student sees it, without signing out:
//  - 'teacher': the teacher's own view (every lesson open, the teacher's pages and alerts);
//  - 'gated':   a student with gated access (each lesson opens once the one before is passed above 60%);
//  - 'full':    a student with full access (every lesson open, but the site otherwise as a student sees it).
// Only what the page shows and opens follows this choice (useTeacherOnScreen, usePreviewAccess). What the account is
// allowed to read and write does not: the teacher stays the teacher for Firebase, and the teacher's own work is never sent
// as a student's results. The choice lasts for this browser tab (session storage), so a new tab opens in the teacher's view.

export type ViewAs = 'teacher' | 'gated' | 'full';

const KEY = 'chem_teacher_view_as';
const EVENT = 'chem-view-as-changed';

export const readViewAs = (): ViewAs => {
  try {
    const value = window.sessionStorage.getItem(KEY);
    return value === 'gated' || value === 'full' ? value : 'teacher';
  } catch {
    return 'teacher';
  }
};

export const setViewAs = (view: ViewAs) => {
  try {
    if (view === 'teacher') window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, view);
  } catch {
    // Storage can be blocked; the choice then lasts until the page is reloaded
  }
  window.dispatchEvent(new CustomEvent<ViewAs>(EVENT, { detail: view }));
};

// The view chosen, kept up to date in every part of the page
export const useViewAs = (): ViewAs => {
  const [view, setView] = useState<ViewAs>(readViewAs);
  useEffect(() => {
    const onChange = (event: Event) => setView((event as CustomEvent<ViewAs>).detail ?? readViewAs());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return view;
};

// True when the page should treat the account as the teacher: the teacher's account in the teacher's view
export const useTeacherOnScreen = (user: Parameters<typeof isTeacher>[0]): boolean => {
  const view = useViewAs();
  return isTeacher(user) && view === 'teacher';
};

// The student access the teacher's account is looking at the site with ('gated' or 'full'), or null in any other case
export const usePreviewAccess = (user: Parameters<typeof isTeacher>[0]): 'gated' | 'full' | null => {
  const view = useViewAs();
  return isTeacher(user) && view !== 'teacher' ? view : null;
};
