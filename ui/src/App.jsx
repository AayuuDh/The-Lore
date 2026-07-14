
import React, { useEffect, useState } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { ThemeProvider, BaseStyles } from "@primer/react";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
// import LeftPanel from "./components/LeftPanel";
import HomePage from "./components/HomePage";
import Discover from "./components/Discover";
import SkillsPage from "./components/SkillsPage";
import AddSkillPage from "./components/AddSkillPage";
import SkillEditor from "./components/SkillEditor";
import ProfilePage from "./components/ProfilePage";
import Footer from "./components/Footer";
import Login from "./components/Login";
import "./App.css";
import PurpleCubeBackground from "./components/PurpleCubeBackground";
import { recordVisit } from "./streaks";
import { ensureProfile } from "./api";

// ---------------------------------------------------------------------------
// DEV-ONLY click-to-source inspector.
// In `npm run dev`, Alt-click (Windows) / Option-click (mac) any element on the
// page to jump straight to the JSX that made it, opened in VS Code. See how it
// gets rendered near the bottom of this file. `import.meta.env.DEV` is `true`
// only for the dev server; Vite compiles it to the literal `false` for a
// production `npm run build`, so this whole block is dead-code-eliminated and
// the package never ships to users. We use React.lazy so the code is only ever
// fetched when the guard is true.
const ClickToComponent = import.meta.env.DEV
  ? React.lazy(() =>
      import("click-to-react-component").then((m) => ({
        default: m.ClickToComponent,
      }))
    )
  : null;

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("Home");
  // When we want to jump straight into a specific skill (from the home page's
  // "Jump back in" row), we stash its id here and switch to the Skills page,
  // which reads it and opens that skill on mount. null = open the catalog.
  const [pendingSkillId, setPendingSkillId] = useState(null);
  // Context carried from Discover into Add Skill: when the guide says "nothing
  // fits, create it", we seed the draft with what the person was looking for.
  const [addSkillSeed, setAddSkillSeed] = useState("");
  // The skill currently open in the editor, plus how we got there: "new" (a
  // fresh draft) or "fork" (editing an existing skill, which saves a copy).
  const [editorSkill, setEditorSkill] = useState(null);
  const [editorMode, setEditorMode] = useState("new");
  // useIsAuthenticated() is an MSAL hook that returns true whenever there's a
  // signed-in account, false otherwise. We DON'T track this ourselves with
  // useState anymore: MSAL owns the truth about auth, and this hook makes our
  // component re-render automatically the moment that truth changes (e.g. right
  // after login completes). That re-render is what swaps the login screen out
  // for the real app below.
  const isAuthenticated = useIsAuthenticated();

  // The signed-in account. localAccountId is a stable per-user GUID we use as
  // the profile key; it is NOT the person's email/alias, so it stays private.
  const { accounts } = useMsal();
  const userId = accounts[0]?.localAccountId ?? null;

  // The user's profile (anonymous username + optional contact info). null until
  // we've fetched/created it. `profileReason` carries a message when we bounce
  // someone to the profile page (e.g. they tried to add a skill first).
  const [profile, setProfile] = useState(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [profileReason, setProfileReason] = useState(null);

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

  // Right after sign-in, fetch-or-create the profile. On the very first sign-in
  // the backend mints an anonymous username and returns is_new=true, which sends
  // the user straight to the onboarding profile screen.
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let cancelled = false;
    ensureProfile(userId)
      .then(({ profile: p, is_new }) => {
        if (cancelled) return;
        setProfile(p);
        if (is_new) {
          setIsOnboarding(true);
          setCurrentPage("Profile");
        }
      })
      .catch((err) => console.error("Could not load profile:", err));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  const handleNavSelect = (page) => {
    // Normal navigation always opens a page fresh, so forget any pending state.
    setPendingSkillId(null);
    setAddSkillSeed("");
    setEditorSkill(null);
    setProfileReason(null);
    if (page !== "Profile") setIsOnboarding(false);
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

  // Open Add Skill, optionally seeded with context from a Discover conversation
  // so the draft starts from what the person was actually looking for.
  const openAddSkill = (seed) => {
    setAddSkillSeed(typeof seed === "string" ? seed : "");
    setCurrentPage("Add Skill");
    setSidebarOpen(false);
  };

  // Open the skill editor. mode "new" = editing a fresh draft; mode "fork" =
  // editing an existing skill, where saving publishes a copy and leaves the
  // original untouched.
  const openEditor = (skill, mode = "new") => {
    setEditorSkill(skill);
    setEditorMode(mode);
    setCurrentPage("Skill Editor");
    setSidebarOpen(false);
  };

  // Called by AddSkillPage when the user still needs to make the "may we contact
  // you" decision before publishing. Bounce them to the profile page with a note.
  const requireProfile = (reason) => {
    setProfileReason(reason);
    setCurrentPage("Profile");
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
            <DevInspector />
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

          <DevInspector />

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
              username={profile?.username}
              onOpenProfile={() => handleNavSelect("Profile")}
            />

            <div className="content-area">
              {/* <LeftPanel /> */}
              <div className="main-content">
                {currentPage === "Skills" ? (
                  <SkillsPage
                    onBackHome={() => handleNavSelect("Home")}
                    initialSkillId={pendingSkillId}
                    onEditSkill={(skill) => openEditor(skill, "fork")}
                  />
                ) : currentPage === "Add Skill" ? (
                  <AddSkillPage
                    onBackHome={() => handleNavSelect("Home")}
                    userId={userId}
                    profile={profile}
                    onRequireProfile={requireProfile}
                    initialDescription={addSkillSeed}
                    onGoToEditor={(skill) => openEditor(skill, "new")}
                    onOpenSkill={openSkill}
                  />
                ) : currentPage === "Skill Editor" ? (
                  <SkillEditor
                    initialSkill={editorSkill}
                    mode={editorMode}
                    userId={userId}
                    profile={profile}
                    onRequireProfile={requireProfile}
                    onBack={() => handleNavSelect("Home")}
                  />
                ) : currentPage === "Profile" ? (
                  <ProfilePage
                    profile={profile}
                    userId={userId}
                    isOnboarding={isOnboarding}
                    reason={profileReason}
                    onSaved={(updated) => {
                      setProfile(updated);
                      setIsOnboarding(false);
                      setProfileReason(null);
                      handleNavSelect("Home");
                    }}
                    onSkip={() => handleNavSelect("Home")}
                  />
                ) : (
                  <Discover
                    onAddSkills={openAddSkill}
                    onOpenSkill={openSkill}
                    onEditSkill={(skill) => openEditor(skill, "fork")}
                    onBrowse={() => handleNavSelect("Skills")}
                    username={profile?.username}
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

// DevInspector renders the click-to-source inspector, but ONLY in the dev
// server. In production `ClickToComponent` is null (see the top of this file),
// so this returns nothing and adds zero bytes to the shipped bundle. Suspense
// gives React something to show while the dev-only chunk loads (nothing).
function DevInspector() {
  if (!ClickToComponent) return null;
  return (
    <React.Suspense fallback={null}>
      <ClickToComponent />
    </React.Suspense>
  );
}

export default App;