/* global __TEAMS_CHAT_URL__ */
// Build-time app configuration.
//
// TEAMS_CHAT_URL is injected by vite.config.js from package.json's
// `config.teamsChatUrl` (see there). Editing that package.json field — or
// overriding it via `npm config set` — changes the link the whole app uses,
// with no code change. The fallback keeps things working if the define is ever
// missing (e.g. an unusual build invocation).
export const TEAMS_CHAT_URL =
  typeof __TEAMS_CHAT_URL__ !== "undefined"
    ? __TEAMS_CHAT_URL__
    : "https://aka.ms/forthelore";
