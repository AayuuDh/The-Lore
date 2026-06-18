// ============================================================================
// Login.jsx
// ----------------------------------------------------------------------------
// The screen shown when nobody is signed in. It has exactly one job: a button
// that kicks off the Microsoft sign-in. It does NOT collect a username or
// password itself (that's the whole point of OAuth: the user types their
// credentials on Microsoft's page, never on ours).
// ============================================================================

import { useState } from "react";
// useMsal is a React hook that gives us the shared MSAL engine (from the
// MsalProvider in main.jsx) so we can trigger login from this component.
import { useMsal } from "@azure/msal-react";
import "./Login.css";
// The logo image. Vite turns this import into a usable URL at build time.
import logo from "../assets/logo light.png";
// The scopes/permissions object we defined in authConfig.js.
import { loginRequest } from "../authConfig";

function Login() {
  // Pull `instance` (the MSAL engine) out of the hook. The { } is object
  // destructuring: useMsal() returns an object and we grab just that field.
  const { instance } = useMsal();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Runs when the user clicks the sign-in button.
  const handleSignIn = () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    // loginRedirect navigates THIS SAME TAB to Microsoft, then Microsoft sends
    // the user back to our redirectUri. We chose redirect over popup because a
    // popup relies on window.opener messaging, which browsers (COOP) sever when
    // the popup visits Microsoft's domain, leaving it stuck open. Redirect has
    // no second window, so nothing to sever. The result is read automatically
    // by MsalProvider on return, which flips useIsAuthenticated() to true.
    // .catch handles the rare case the redirect call itself throws.
    instance.loginRedirect(loginRequest).catch((error) => {
      console.error("Sign-in failed:", error);
      setIsSigningIn(false);
    });
  };

  return (
    <div className="login">
        <img
          className="login__logo"
          src={logo}
          width="120"
          height="150"
          alt="Logo"
        />

      <div className="login__card">
        <h1 className="login__title">Welcome to The Lore</h1>
        <p className="login__subtitle">Sign in with your Microsoft account to continue.</p>

        <button type="button" className="login__button" onClick={handleSignIn} disabled={isSigningIn}>
          {isSigningIn ? "Redirecting..." : "Sign in with Microsoft"}
        </button>
      </div>
    </div>
  );
}

export default Login;
