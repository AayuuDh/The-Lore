  import React, { useState } from "react";
import { ThemeProvider, BaseStyles } from "@primer/react";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
// import LeftPanel from "./components/LeftPanel";
import HomePage from "./components/HomePage";
import SkillsPage from "./components/SkillsPage";
import Footer from "./components/Footer";
import "./App.css";
import PurpleCubeBackground from "./components/PurpleCubeBackground";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("Home");

  const handleNavSelect = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

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