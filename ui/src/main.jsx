// ============================================================================
// main.jsx
// ----------------------------------------------------------------------------
// This is the app's ENTRY POINT: the first JS that runs when the page loads.
// Its job here is to (1) build the one MSAL auth object, (2) initialize it,
// then (3) hand it to React so every component can use auth. Order matters:
// MSAL must be ready BEFORE React renders anything that asks about auth.
// ============================================================================

import React from "react";
// react-dom/client is the part of React that actually mounts the app into the
// real HTML page (the browser DOM).
import ReactDOM from "react-dom/client";
// PublicClientApplication = the core MSAL engine. EventType = a list of named
// events (login success, logout, etc.) we can listen for.
import { PublicClientApplication, EventType } from "@azure/msal-browser";
// MsalProvider = a React wrapper that shares the MSAL engine with every
// component below it via React context, so hooks like useMsal() work anywhere.
import { MsalProvider } from "@azure/msal-react";
import { BrowserRouter } from "react-router-dom";
// Global styles (Primer design system + our own overrides). Not auth-related.
import "@primer/css/dist/primer.css";
import "./index.css";
// Our top-level React component (the whole UI lives under this).
import App from "./App";
// The settings object we wrote in authConfig.js.
import { msalConfig } from "./authConfig";
// Microsoft Clarity — behavioral analytics (session replays, heatmaps, insights).
import Clarity from "@microsoft/clarity";

// Initialize Clarity only when a project ID is provided (via ui/.env). This
// keeps analytics out of local dev unless you opt in, and avoids errors when
// the ID is unset.
const clarityProjectId = import.meta.env.VITE_CLARITY_ID;
if (clarityProjectId) {
  Clarity.init(clarityProjectId);
}

// Create ONE MSAL engine for the entire app, configured by our settings.
// One shared instance matters: it holds the single source of truth for who is
// signed in. Making more than one would split that state and cause bugs.
const msalInstance = new PublicClientApplication(msalConfig);

// MSAL v3+ requires an explicit async initialize() before you use it (it does
// internal setup like reading cached tokens). It returns a Promise, so we wait
// for it with .then(...) and only render React once it has finished.
msalInstance.initialize().then(async () => {
  // Consume Microsoft's redirect response before React Router renders. The
  // authorization result lives in the URL hash, so mounting the unauthenticated
  // /login redirect first can erase it before MSAL creates the signed-in account.
  const redirectResult = await msalInstance.handleRedirectPromise();
  if (redirectResult?.account) {
    msalInstance.setActiveAccount(redirectResult.account);
  }

  // getAllAccounts() returns any accounts MSAL already knows about (e.g. a
  // session cached from a previous visit). If there's at least one...
  const accounts = msalInstance.getAllAccounts();
  if (!msalInstance.getActiveAccount() && accounts.length > 0) {
    // ...mark the first one as "active" so the rest of the app knows which
    // account is the current user without us passing it around manually.
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Register a listener that fires on MSAL events. We care about LOGIN_SUCCESS:
  // right after a fresh sign-in completes, set that account as active too.
  // event.payload?.account uses optional chaining (?.) so we don't crash if
  // payload is missing for some event type.
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
      msalInstance.setActiveAccount(event.payload.account);
    }
  });

  // Now MSAL is ready, so render React. createRoot finds the <div id="root">
  // in index.html and mounts our component tree into it.
  ReactDOM.createRoot(document.getElementById("root")).render(
    // StrictMode is a dev-only helper that surfaces potential bugs; no effect
    // in production builds.
    <React.StrictMode>
      {/* MsalProvider shares msalInstance with everything inside it. Because
          <App/> is a child, any component in the app can call MSAL hooks. */}
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>
  );
});