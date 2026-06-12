// ============================================================================
// authConfig.js
// ----------------------------------------------------------------------------
// This file is the single source of truth for HOW we talk to Microsoft's
// identity system (Entra ID, formerly Azure AD). Nothing here runs auth by
// itself; it just describes the settings that main.jsx and Login.jsx use.
// ============================================================================

// LogLevel is an enum (Error / Warning / Info / Verbose) we use below to tell
// MSAL how chatty to be in the console. We only need it for the logger block.
import { LogLevel } from "@azure/msal-browser";

// `export` makes this object importable from other files (main.jsx imports it).
// `const` because the config never gets reassigned after we define it.
export const msalConfig = {
  // --- auth: WHO we are and WHERE Microsoft sends the user back ---
  auth: {
    // The Application (client) ID GUID from the Entra app registration.
    // It identifies OUR app to Microsoft. import.meta.env is Vite's way of
    // reading environment variables; only vars prefixed VITE_ are exposed to
    // the browser. The actual value lives in ui/.env (gitignored).
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,

    // The "authority" is the URL of the login server MSAL talks to. The tenant
    // ID GUID at the end scopes it to OUR organization's directory, so only
    // accounts from our tenant can sign in. Backticks = template literal: the
    // ${...} part is replaced with the tenant ID from .env at build time.
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,

    // After login, Microsoft sends the user back to THIS exact URL. It must
    // match a Redirect URI registered in Entra character-for-character
    // (protocol, host, port, path). This is the security whitelist that stops
    // an attacker redirecting the login result to their own site.
    redirectUri: "http://localhost:5173",
  },

  // --- cache: WHERE the browser stores the signed-in session ---
  cache: {
    // "sessionStorage" = the login lives only as long as the tab is open;
    // close the tab and you're signed out. "localStorage" would survive tab
    // closes and restarts (more convenient, slightly larger attack surface).
    cacheLocation: "sessionStorage",

    // Storing auth state in a cookie is a workaround for old browsers (IE11).
    // We don't need it, so false.
    storeAuthStateInCookie: false,
  },

  // --- system: developer/diagnostic settings (not required for auth to work) ---
  system: {
    loggerOptions: {
      // Verbose = log EVERYTHING MSAL does. Great while debugging; you'd lower
      // this to LogLevel.Error (or delete the whole system block) for prod.
      logLevel: LogLevel.Verbose,

      // MSAL calls this function for each log line. We just forward the message
      // to the browser console, prefixed with [MSAL] so it's easy to filter.
      // `level` is available too if you wanted to color/route by severity.
      loggerCallback: (level, message) => {
        console.log(`[MSAL] ${message}`);
      },
    },
  },
};

// --- loginRequest: WHAT permissions we ask for at sign-in ---
// `scopes` are the permissions we request. "User.Read" is the most basic
// Microsoft Graph permission: it lets us read the signed-in user's own basic
// profile (name, email). We pass this object into loginRedirect() in Login.jsx.
export const loginRequest = {
  scopes: ["User.Read"],
};
