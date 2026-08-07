// ============================================================================
// main.jsx
// ----------------------------------------------------------------------------
// This is the app's entry point.
// ============================================================================

import React from "react";
// react-dom/client is the part of React that actually mounts the app into the
// real HTML page (the browser DOM).
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Global styles (Primer design system + our own overrides). Not auth-related.
import "@primer/css/dist/primer.css";
import "./index.css";
// Our top-level React component (the whole UI lives under this).
import App from "./App";

// Own scroll position ourselves. Without this the browser restores the previous
// scroll offset on reload — which, on a tall page like /home, lands the user
// scrolled to the bottom. Components reset to the top on mount instead.
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);