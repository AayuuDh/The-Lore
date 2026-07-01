
import React, { useEffect, useState } from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import { ThemeProvider, BaseStyles } from "@primer/react";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
// import LeftPanel from "./components/LeftPanel";
import HomePage from "./components/HomePage";
import SkillsPage from "./components/SkillsPage";
import AddSkillPage from "./components/AddSkillPage";
import Footer from "./components/Footer";
import Login from "./components/Login";
import "./App.css";
import PurpleCubeBackground from "./components/PurpleCubeBackground";
import { recordVisit } from "./streaks";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("Home");
  // When we want to jump straight into a specific skill (from the home page's
  // "Jump back in" row), we stash its id here and switch to the Skills page,
  // which reads it and opens that skill on mount. null = open the catalog.
  const [pendingSkillId, setPendingSkillId] = useState(null);
  // useIsAuthenticated() is an MSAL hook that returns true whenever there's a
  // signed-in account, false otherwise. We DON'T track this ourselves with
  // useState anymore: MSAL owns the truth about auth, and this hook makes our
  // component re-render automatically the moment that truth changes (e.g. right
  // after login completes). That re-render is what swaps the login screen out
  // for the real app below.
  const isAuthenticated = useIsAuthenticated();

  // The daily streak (how many days in a row you've used The Lore). We record
  // today's visit once, right after sign-in, and keep the result in state so the
  // TopNav can show the flame counter. recordVisit() is safe to call every load:
  // it only bumps the streak once per calendar day.
  const [streak, setStreak] = useState(null);
  useEffect(() => {
    if (isAuthenticated) {
      setStreak(recordVisit());
    }
  }, [isAuthenticated]);

  const handleNavSelect = (page) => {
    // Normal navigation always opens a page fresh, so forget any pending skill.
    setPendingSkillId(null);
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  // Open a specific skill's detail view from anywhere. Unlike handleNavSelect,
  // this keeps the skill id so SkillsPage opens straight to that skill.
  const openSkill = (skillId) => {
    setPendingSkillId(skillId);
    setCurrentPage("Skills");
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
              streak={streak}
            />

            <div className="content-area">
              {/* <LeftPanel /> */}
              <div className="main-content">
                {currentPage === "Skills" ? (
                  <SkillsPage
                    onBackHome={() => handleNavSelect("Home")}
                    initialSkillId={pendingSkillId}
                  />
                ) : currentPage === "Add Skill" ? (
                  <AddSkillPage onBackHome={() => handleNavSelect("Home")} />
                ) : (
                  <HomePage
                    onDiscoverSkills={() => handleNavSelect("Skills")}
                    onAddSkills={() => handleNavSelect("Add Skill")}
                    onOpenSkill={openSkill}
                  />
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