// favorites.js
// ---------------------------------------------------------------------------
// This is the ONLY file in the app that talks to the browser's localStorage for
// favorites. Everything else (buttons, pages) calls these functions and never
// touches localStorage directly. Same idea as skills_loader.py on the backend:
// if we ever change WHERE favorites live (a database, an account, the cloud),
// we only rewrite this one file and the rest of the app doesn't notice.
//
// What is localStorage? A tiny key -> value box built into every browser. You
// put a string in under some key, and it stays there across refreshes and even
// after you close the tab. React's useState forgets everything on refresh;
// localStorage remembers. We store the list of skill ids you've starred.

// The single key under which we save the list. Namespacing it with "the-lore:"
// keeps it from clashing with anything else the browser stores for this site.
const STORAGE_KEY = "the-lore:favorites";

// Read the saved favorites and hand them back as an array of skill ids.
// localStorage can only hold strings, so we save a JSON string and parse it
// back here. The try/catch is defensive: if the stored value is ever missing or
// corrupted, we don't crash the app, we just start from an empty list.
export function getFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Make sure we actually got a list back before trusting it.
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Save an array of skill ids back into localStorage. localStorage only stores
// strings, so we turn the array into a JSON string on the way in.
function saveFavorites(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // If saving fails (e.g. storage is full or blocked), we quietly ignore it
    // rather than crashing. Favorites are a nice-to-have, not critical data.
  }
}

// Is this particular skill currently a favorite? Returns true/false.
export function isFavorite(skillId) {
  return getFavorites().includes(skillId);
}

// Flip a skill's favorite state: if it's already a favorite, remove it; if not,
// add it. Returns the updated list of favorite ids so the caller can refresh
// what it shows on screen.
export function toggleFavorite(skillId) {
  const current = getFavorites();
  const next = current.includes(skillId)
    ? current.filter((id) => id !== skillId) // remove it
    : [...current, skillId];                 // add it
  saveFavorites(next);
  return next;
}
