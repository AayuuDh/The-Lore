// ============================================================================
// msalInstance.js
// ----------------------------------------------------------------------------
// The ONE MSAL engine for the whole app, in its own module so that both the
// React tree (main.jsx) and the plain-JS API client (api.js) can reach it.
//
// Why not just build it in main.jsx? api.js needs it to attach an access token
// to each backend call, and api.js is imported *by* the components that main.jsx
// renders — so importing main.jsx from api.js would be a circular import. A
// separate module both can import breaks the cycle.
//
// One shared instance matters: it holds the single source of truth for who is
// signed in, and its token cache. Building a second one would split that state.
// main.jsx still owns the lifecycle — it calls initialize() before rendering.
// ============================================================================

import { PublicClientApplication } from "@azure/msal-browser";

import { msalConfig } from "./authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);
