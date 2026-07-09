// achievements.js — works out which badges you've earned from your activity.
//
// This module stores NOTHING of its own. It's a read-only view over the other
// sealed modules (favorites, streaks, recently viewed): a badge is just a rule
// checked against your current numbers. To add a new badge, add one entry to
// BADGES below — nothing else needs to change.

import { getFavorites } from "./favorites";
import { getStreak } from "./streaks";
import { getRecentlyViewed } from "./recentlyViewed";

// Each badge knows how to check itself against a small stats snapshot.
const BADGES = [
  {
    id: "first-view",
    emoji: "👀",
    title: "First Look",
    description: "Open your first skill.",
    earned: (s) => s.viewed >= 1,
  },
  {
    id: "explorer",
    emoji: "🧭",
    title: "Explorer",
    description: "Open 5 different skills.",
    earned: (s) => s.viewed >= 5,
  },
  {
    id: "first-favorite",
    emoji: "⭐",
    title: "Curator",
    description: "Star your first skill.",
    earned: (s) => s.favorites >= 1,
  },
  {
    id: "collector",
    emoji: "📚",
    title: "Collector",
    description: "Star 10 skills.",
    earned: (s) => s.favorites >= 10,
  },
  {
    id: "streak-3",
    emoji: "🔥",
    title: "On a Roll",
    description: "Reach a 3-day streak.",
    earned: (s) => s.longestStreak >= 3,
  },
  {
    id: "streak-7",
    emoji: "🏆",
    title: "Week Warrior",
    description: "Reach a 7-day streak.",
    earned: (s) => s.longestStreak >= 7,
  },
];

// Snapshot the numbers each badge cares about, read live from localStorage.
function getStats() {
  const streak = getStreak();
  return {
    favorites: getFavorites().length,
    viewed: getRecentlyViewed().length,
    longestStreak: streak.longest || 0,
  };
}

// Return every badge tagged with whether it's earned yet. The UI shows earned
// ones bright and locked ones dimmed, so people can see what to aim for next.
export function getAchievements() {
  const stats = getStats();
  return BADGES.map((badge) => ({
    id: badge.id,
    emoji: badge.emoji,
    title: badge.title,
    description: badge.description,
    earned: badge.earned(stats),
  }));
}

// Handy summary for a header like "3 / 6 earned".
export function getAchievementSummary() {
  const all = getAchievements();
  return { earned: all.filter((b) => b.earned).length, total: all.length };
}
