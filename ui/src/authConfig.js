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

// Fail loudly, here, if the Entra GUIDs are missing from ui/.env. Without this
// the missing value is interpolated into the authority URL as the literal string
// "undefined", and the first sign-in attempt fails on Microsoft's own page with
// AADSTS900023 ("tenant identifier 'undefined'") — an error that gives no hint
// the cause is a local env file. We log rather than throw on purpose: throwing
// at module scope would blank the page instead of showing the login screen.
const REQUIRED_ENV = ["VITE_MSAL_CLIENT_ID", "VITE_MSAL_TENANT_ID"];
const missingEnv = REQUIRED_ENV.filter((key) => !import.meta.env[key]);
if (missingEnv.length > 0) {
  console.error(
    `[auth] ui/.env is missing ${missingEnv.join(", ")}. Sign-in will fail ` +
      `with AADSTS900023. See ui/.env.example, then restart the dev server — ` +
      `Vite only reads .env at startup.`
  );
}

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
    //
    // We use window.location.origin (the URL the app is currently served from)
    // so the same build works everywhere: http://localhost:5173 in dev, the
    // real https://… domain in production. Each origin must still be registered
    // as a Redirect URI in the Entra app registration.
    redirectUri:
      import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin,

    // Stay on the callback URL after MSAL consumes the response. React Router
    // then sends the authenticated user to /home instead of reloading /login.
    navigateToLoginRequestUrl: false,
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

// --- API_SCOPE: the permission for OUR OWN backend ---
// Built from the client id rather than hardcoded so the two can never drift —
// the identifierUri on the app registration is literally api://<client-id>.
// Declared before loginRequest because that requests it at sign-in.
export const API_SCOPE = `api://${
  import.meta.env.VITE_MSAL_CLIENT_ID
}/Lore.Read`;

// --- loginRequest: WHAT permissions we ask for at sign-in ---
// `scopes` are the permissions we request. "User.Read" is the most basic
// Microsoft Graph permission: it lets us read the signed-in user's own basic
// profile (name, email). We pass this object into loginRedirect() in Login.jsx.
//
// API_SCOPE is requested here too, so the user consents to BOTH in the single
// interaction they already expect. Asking for it later instead means the first
// backend call discovers it needs consent and has to start a second redirect
// from inside a data fetch — which is unsafe, because several fetches run at
// once on mount and MSAL supports only one interaction at a time.
export const loginRequest = {
  scopes: ["User.Read", API_SCOPE],
};

// The permission for OUR OWN backend, used by api.js to get a token per call.
// "User.Read" is a *Microsoft Graph* scope, so the token it returns is addressed
// to Graph and our API cannot validate it. Calling the backend needs a token
// addressed to us, which means a scope we ourselves expose.
export const apiRequest = {
  scopes: [API_SCOPE],
};
