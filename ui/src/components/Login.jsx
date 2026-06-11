import React, { useState } from "react";
import "./Login.css";
import logo from "../assets/logo light.png";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin?.();
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

      <form className="login__card" onSubmit={handleSubmit}>
        <h1 className="login__title">Welcome to The Lore</h1>
        <p className="login__subtitle">Sign in to continue.</p>

        <div className="login__field">
          <label className="login__label" htmlFor="login-username">
            Username
          </label>
          <input
            id="login-username"
            className="login__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
            required
          />
        </div>

        <div className="login__field">
          <div className="login__label-row">
            <label className="login__label" htmlFor="login-password">
              Password
            </label>
            <button
              type="button"
              className="login__forgot"
              onClick={(e) => e.preventDefault()}
            >
              Forgot password?
            </button>
          </div>
          <input
            id="login-password"
            className="login__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="login__button">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
