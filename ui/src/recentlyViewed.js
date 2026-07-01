// recentlyViewed.js — remembers the skills you've opened recently.
//
// Sealed module, exactly like favorites.js and streaks.js: this is the ONLY
// file that touches the "recently viewed" localStorage key. Everything else
// just calls getRecentlyViewed() and recordView(). Personal data, never leaves
// the browser — no backend involved.

const STORAGE_KEY = "the-lore:recently-viewed";
// How many recent skills to keep. Enough to fill one "Jump back in" row.
const MAX_ITEMS = 6;

// Read the saved list, newest first. Returns [] if nothing's saved or the data
// is somehow corrupt (JSON.parse can throw), so callers never have to guard.
export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Private: write the list back. Wrapped in try/catch because localStorage can
// throw in private-browsing mode or when it's full.
function saveRecentlyViewed(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Not worth crashing the app over a failed write.
  }
}

// Record that a skill was just opened. Moves it to the FRONT of the list,
// removes any older duplicate of the same skill, and caps the list at
// MAX_ITEMS. We store just enough (id/name/description) to render a card so the
// home page doesn't need another API call. Returns the updated list.
export function recordView(skill) {
  if (!skill || !skill.id) return getRecentlyViewed();

  const entry = {
    id: skill.id,
    name: skill.name || skill.id,
    description: skill.description || "",
  };

  // Drop any existing copy of this skill, then put the fresh one on top.
  const withoutDupe = getRecentlyViewed().filter((s) => s.id !== entry.id);
  const updated = [entry, ...withoutDupe].slice(0, MAX_ITEMS);

  saveRecentlyViewed(updated);
  return updated;
}
