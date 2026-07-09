// streaks.js
// ---------------------------------------------------------------------------
// The ONLY file that manages the "daily streak" in localStorage. Same sealed-
// storage idea as favorites.js: the rest of the app just calls recordVisit()
// and getStreak(), and never touches localStorage or date math itself.
//
// A streak = how many days in a row you've opened The Lore (Duolingo-style).
// We store three things:
//   current        - the streak you're currently on
//   longest        - your all-time best (for bragging rights)
//   lastActiveDate - the last day we counted, as "YYYY-MM-DD"
//
// The whole trick is comparing "today" to "the last day we saw you":
//   - same day  -> already counted, do nothing
//   - yesterday -> streak continues, add 1
//   - older/gap -> streak broke, restart at 1

const STORAGE_KEY = "the-lore:streak";

// Turn a Date into a plain "YYYY-MM-DD" string in LOCAL time. We deliberately
// avoid toISOString() because that uses UTC, which can roll the date over at
// the wrong time for anyone not on UTC. Comparing date strings (not timestamps)
// means "same day" ignores the clock time.
function dayString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Read the saved streak. The try/catch keeps a missing or corrupted value from
// crashing the app, we just fall back to a fresh, zeroed streak.
export function getStreak() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { current: 0, longest: 0, lastActiveDate: null };
    const parsed = JSON.parse(raw);
    return {
      current: parsed.current ?? 0,
      longest: parsed.longest ?? 0,
      lastActiveDate: parsed.lastActiveDate ?? null,
    };
  } catch {
    return { current: 0, longest: 0, lastActiveDate: null };
  }
}

function saveStreak(streak) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(streak));
  } catch {
    // Streaks are a nice-to-have; if storage is full/blocked, ignore quietly.
  }
}

// Call this once when the app loads. It figures out whether today should extend
// the streak, break it, or was already counted, updates localStorage, and hands
// back the fresh streak so the UI can show it.
export function recordVisit(now = new Date()) {
  const streak = getStreak();
  const today = dayString(now);

  // Already counted today: nothing changes.
  if (streak.lastActiveDate === today) {
    return streak;
  }

  // What was yesterday, relative to `now`?
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayString(yesterdayDate);

  // If the last visit was yesterday, the streak continues (+1). Otherwise it
  // either never started or a day was missed, so it restarts at 1.
  const current = streak.lastActiveDate === yesterday ? streak.current + 1 : 1;
  const longest = Math.max(streak.longest, current);

  const updated = { current, longest, lastActiveDate: today };
  saveStreak(updated);
  return updated;
}
