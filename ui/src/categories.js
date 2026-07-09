// categories.js — gives each skill a rough category based on keywords in its
// name and description.
//
// The skill data has no category field yet, so we derive one here on the client.
// This is deliberately the ONLY place that logic lives: when the backend starts
// returning a real `category`, swap the body of getCategory() and the UI (which
// just calls getCategory / getAllCategories) won't need to change.

// Order matters: the FIRST rule whose keyword appears wins, so put the more
// specific categories higher up.
const CATEGORY_RULES = [
  {
    label: "Meetings",
    keywords: ["meeting", "transcript", "standup", "agenda", "minutes"],
  },
  {
    label: "Coding",
    keywords: [
      "code", "coding", "bug", "debug", "refactor", "unit test", "api",
      "function", "programming", "pull request", "commit", "git", "review",
    ],
  },
  {
    label: "Data",
    keywords: ["sql", "query", "dataset", "analyz", "analys", "chart", "csv", "spreadsheet", "metrics"],
  },
  {
    label: "Planning",
    keywords: ["plan", "roadmap", "project", "sprint", "milestone", "schedule", "timeline", "backlog"],
  },
  {
    label: "Design",
    keywords: ["design", "wireframe", "prototype", "brand", "logo", "ux", "mockup"],
  },
  {
    label: "Writing",
    keywords: ["write", "writing", "email", "summar", "draft", "blog", "content", "copy", "document", "rewrite", "proofread"],
  },
];

const DEFAULT_CATEGORY = "Other";

// The category label for a single skill. Always returns something (falls back
// to "Other"), so callers never have to null-check.
export function getCategory(skill) {
  const haystack = `${skill?.name || ""} ${skill?.description || ""}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return rule.label;
    }
  }
  return DEFAULT_CATEGORY;
}

// Every category label in display order, with "Other" last. Used to build the
// filter chips in a stable order (not alphabetized, so chips don't jump around).
export function getAllCategories() {
  return [...CATEGORY_RULES.map((r) => r.label), DEFAULT_CATEGORY];
}
