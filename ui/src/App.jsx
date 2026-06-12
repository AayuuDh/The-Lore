  import React, { useState } from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import { ThemeProvider, BaseStyles } from "@primer/react";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
// import LeftPanel from "./components/LeftPanel";
import HomePage from "./components/HomePage";
import SkillsPage from "./components/SkillsPage";
import Footer from "./components/Footer";
import Login from "./components/Login";
import "./App.css";
import PurpleCubeBackground from "./components/PurpleCubeBackground";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("Home");
  // useIsAuthenticated() is an MSAL hook that returns true whenever there's a
  // signed-in account, false otherwise. We DON'T track this ourselves with
  // useState anymore: MSAL owns the truth about auth, and this hook makes our
  // component re-render automatically the moment that truth changes (e.g. right
  // after login completes). That re-render is what swaps the login screen out
  // for the real app below.
  const isAuthenticated = useIsAuthenticated();

  const handleNavSelect = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  // THE AUTH GATE. If nobody is signed in, render ONLY the login screen and
  // stop here (return exits the function early). Because isAuthenticated comes
  // from MSAL, the instant the user signs in this becomes true, App re-renders,
  // skips this block, and falls through to the real app below.
  if (!isAuthenticated) {
    return (
      // ThemeProvider/BaseStyles set up Primer's dark theme + base CSS resets.
      <ThemeProvider colorMode="dark">
        <BaseStyles>
          <div className="app-container">
            {/* The animated background behind the login card. */}
            <PurpleCubeBackground />
            {/* No props needed: Login triggers MSAL itself, and this component
                re-renders automatically when auth state flips. */}
            <Login />
          </div>
        </BaseStyles>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider colorMode="dark">
      <BaseStyles>
        <div className="app-container">

          <PurpleCubeBackground />
          
          {/* Sidebar overlay */}
          {sidebarOpen && (
            <div
              className="overlay"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Collapsible Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            currentPage={currentPage}
            onNavigate={handleNavSelect}
          />

          {/* Main wrapper */}
          <div className="main-wrapper">
            <TopNav
              onMenuClick={() => setSidebarOpen(true)}
              currentPage={currentPage}
            />

            <div className="content-area">
              {/* <LeftPanel /> */}
              <div className="main-content">
                {currentPage === "Skills" ? (
                  <SkillsPage onBackHome={() => handleNavSelect("Home")} />
                ) : (
                  <HomePage onDiscoverSkills={() => handleNavSelect("Skills")} />
                )}
              </div>
            </div>

            <Footer />
          </div>
        </div>
      </BaseStyles>
    </ThemeProvider>
  );
}

export default App;