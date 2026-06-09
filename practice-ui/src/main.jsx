// Entry point. Two jobs here:
//   1. Mount <App /> into the #root div from index.html.
//   2. Wrap everything in <BrowserRouter> so the URL-routing tools work.
//
// BrowserRouter is what watches the browser's address bar. Nothing inside
// it can use <Link>, <Routes>, or useParams() unless it's wrapped here.

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
