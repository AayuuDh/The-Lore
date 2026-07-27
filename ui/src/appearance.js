export const DEFAULT_APPEARANCE = Object.freeze({
  theme: "purple",
  mode: "light",
});

const STORAGE_KEY = "the-lore:appearance";
const THEMES = new Set(["purple", "m365"]);
const MODES = new Set(["dark", "light"]);

export function normalizeAppearance(value) {
  return {
    theme: THEMES.has(value?.theme) ? value.theme : DEFAULT_APPEARANCE.theme,
    mode: MODES.has(value?.mode) ? value.mode : DEFAULT_APPEARANCE.mode,
  };
}

export function loadAppearance() {
  try {
    return normalizeAppearance(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(value) {
  const appearance = normalizeAppearance(value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  return appearance;
}