
import React, { useEffect, useState } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { ThemeProvider, BaseStyles } from "@primer/react";
import { Navigate, Route, Routes, matchPath, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
// import LeftPanel from "./components/LeftPanel";
import Discover from "./components/Discover";
import SkillsPage from "./components/SkillsPage";
import AddSkillPage from "./components/AddSkillPage";
import SkillEditor from "./components/SkillEditor";
import ProfilePage from "./components/ProfilePage";
import SettingsPage from "./components/SettingsPage";
import Footer from "./components/Footer";
import Login from "./components/Login";
import FeedbackWidget from "./components/FeedbackWidget";
import { LeaveGuardContext, useLeaveGuardController } from "./components/LeaveGuard";
import "./App.css";
import PurpleCubeBackground from "./components/PurpleCubeBackground";
import { recordVisit } from "./streaks";
import { ensureProfile } from "./api";
import { ensureDefaultFavorite } from "./favorites";
import { loadAppearance, saveAppearance } from "./appearance";

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
  const [appearance, setAppearance] = useState(loadAppearance);
  const [appearancePreview, setAppearancePreview] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  // App-wide guard for "leave unsaved work?" navigations (see LeaveGuard.jsx).
  const { requestLeave, contextValue: leaveGuardValue, modal: leaveGuardModal } =
    useLeaveGuardController();
  const pathname = location.pathname;
  const skillMatch = matchPath("/browse/:skillId", pathname);
  const skillId = skillMatch?.params.skillId ?? null;
  const settingsMatch = matchPath("/settings/:section", pathname);
  const settingsSections = new Set(["general", "appearance", "profile", "privacy"]);
  const requestedSettingsSection = pathname === "/appearance"
    ? "appearance"
    : settingsMatch?.params.section ?? "general";
  const settingsSection = settingsSections.has(requestedSettingsSection)
    ? requestedSettingsSection
    : "general";
  const isSettingsRoute = pathname === "/appearance" || pathname === "/settings" || pathname.startsWith("/settings/");

  const pageTitle = pathname === "/home" ? "Home"
    : pathname === "/favorites" ? "Favorited"
    : pathname.startsWith("/browse") ? "Browse Skills"
    : pathname === "/create/editor" ? "Skill Editor"
    : pathname === "/create" ? "Create Skill"
    : pathname === "/profile" ? "Profile"
    : pathname === "/appearance" ? "Appearance"
    : pathname.startsWith("/settings") ? "Settings"
    : pathname === "/updates" ? "Updates"
    : pathname === "/accessibility" ? "Accessibility"
    : "Home";
  const sidebarPage = pathname === "/home" ? "Home"
    : pathname === "/favorites" ? "Favorited"
    : pathname.startsWith("/create") ? "Add Skill"
    : "";
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
  const accountEmail = accounts[0]?.username ?? "";

  // The user's profile (anonymous username + optional contact info). null until
  // we've fetched/created it.
  const [profile, setProfile] = useState(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // The daily streak (how many days in a row you've used The Lore). We record
  // today's visit once, right after sign-in, and keep the result in state so the
  // TopNav can show the flame counter. recordVisit() is safe to call every load:
  // it only bumps the streak once per calendar day.
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const updateTimer = window.setTimeout(() => {
      setStreak(recordVisit());
    }, 0);
    return () => window.clearTimeout(updateTimer);
  }, [isAuthenticated]);

  // Seed the one-time demo favorite so a new user's Favorites is never empty.
  // No-ops after the first successful seed and respects later unfavoriting.
  useEffect(() => {
    if (!isAuthenticated) return;
    ensureDefaultFavorite();
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
          navigate("/profile", { replace: true });
        }
      })
      .catch((err) => console.error("Could not load profile:", err));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, userId]);

  const handleNavSelect = (page) => {
    // Home is the one destination that may abandon in-progress work (e.g. a live
    // discovery conversation). Route it through the leave guard: it confirms
    // first only when a page has registered active abandonable state, and
    // otherwise navigates straight through.
    if (page === "Home") {
      requestLeave(() => {
        setIsOnboarding(false);
        navigate("/home");
        setSidebarOpen(false);
      });
      return;
    }
    if (page !== "Profile") setIsOnboarding(false);
    const routes = {
      Home: "/home",
      Skills: "/browse",
      "Add Skill": "/create",
      Favorited: "/favorites",
      Profile: "/profile",
      Settings: "/settings",
    };
    navigate(routes[page] ?? "/home");
    setSidebarOpen(false);
  };

  const openSkill = (nextSkillId) => {
    navigate(`/browse/${encodeURIComponent(nextSkillId)}`);
    setSidebarOpen(false);
  };

  const openAddSkill = (seed) => {
    navigate("/create", {
      state: { seed: typeof seed === "string" ? seed : "" },
    });
    setSidebarOpen(false);
  };

  const openEditor = (skill, mode = "new") => {
    navigate("/create/editor", { state: { skill, mode } });
    setSidebarOpen(false);
  };

  // Called by AddSkillPage when the user still needs to make the "may we contact
  // you" decision before publishing. Bounce them to the profile page with a note.
  const requireProfile = (reason) => {
    navigate("/profile", { state: { profileReason: reason } });
    setSidebarOpen(false);
  };

  const openSettings = (section = "general") => {
    setAppearancePreview(null);
    navigate(section === "appearance" ? "/appearance" : section === "general" ? "/settings" : `/settings/${section}`);
    setSidebarOpen(false);
  };

  const commitAppearance = (nextAppearance) => {
    const savedAppearance = saveAppearance(nextAppearance);
    setAppearance(savedAppearance);
    setAppearancePreview(null);
  };

  const visibleAppearance = isSettingsRoute && appearancePreview
    ? appearancePreview
    : appearance;

  // THE AUTH GATE. If nobody is signed in, render ONLY the login screen and
  // stop here (return exits the function early). Because isAuthenticated comes
  // from MSAL, the instant the user signs in this becomes true, App re-renders,
  // skips this block, and falls through to the real app below.
  if (!isAuthenticated) {
    return (
      <ThemeProvider colorMode={appearance.mode}>
        <BaseStyles>
          <div
            className="app-container"
            data-theme={appearance.theme}
            data-mode={appearance.mode}
          >
            <DevInspector />
            {/* The animated background behind the login card. */}
            <PurpleCubeBackground theme={appearance.theme} mode={appearance.mode} />
            {/* No props needed: Login triggers MSAL itself, and this component
                re-renders automatically when auth state flips. */}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </BaseStyles>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider colorMode={visibleAppearance.mode}>
      <BaseStyles>
       <LeaveGuardContext.Provider value={leaveGuardValue}>
        <div
          className={`app-container${sidebarOpen ? " app-container--sidebar-open" : ""}`}
          data-theme={visibleAppearance.theme}
          data-mode={visibleAppearance.mode}
        >

          <DevInspector />

          <PurpleCubeBackground
            theme={visibleAppearance.theme}
            mode={visibleAppearance.mode}
          />
          
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
            currentPage={sidebarPage}
            onNavigate={handleNavSelect}
            userId={userId}
            onOpenSkill={openSkill}
          />

          {/* Main wrapper */}
          <div className="main-wrapper">
            <TopNav
              onMenuClick={() => setSidebarOpen((open) => !open)}
              sidebarOpen={sidebarOpen}
              currentPage={pageTitle}
              streak={streak}
              email={accountEmail}
              nickname={profile?.nickname}
              username={profile?.username}
              onHome={() => handleNavSelect("Home")}
              onOpenProfile={() => handleNavSelect("Profile")}
              onOpenSettings={() => openSettings("general")}
              onOpenAppearance={() => openSettings("appearance")}
              onOpenUpdates={() => navigate("/updates")}
              onOpenAccessibility={() => navigate("/accessibility")}
              onOpenSkill={openSkill}
            />

            <div className="content-area">
              {/* <LeftPanel /> */}
              <div className="main-content">
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/login" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={
                    <Discover
                      onAddSkills={openAddSkill}
                      onOpenSkill={openSkill}
                      onEditSkill={(skill) => openEditor(skill, "fork")}
                      onBrowse={() => handleNavSelect("Skills")}
                      username={profile?.username}
                      userId={userId}
                    />
                  } />
                  <Route path="/browse" element={
                    <SkillsPage
                      key="browse"
                      onBackHome={() => handleNavSelect("Home")}
                      onEditSkill={(skill) => openEditor(skill, "fork")}
                      userId={userId}
                    />
                  } />
                  <Route path="/browse/:skillId" element={
                    <SkillsPage
                      key={`browse-${skillId}`}
                      onBackHome={() => handleNavSelect("Home")}
                      initialSkillId={skillId}
                      onEditSkill={(skill) => openEditor(skill, "fork")}
                      userId={userId}
                    />
                  } />
                  <Route path="/favorites" element={
                    <SkillsPage
                      key="favorites"
                      onBackHome={() => handleNavSelect("Home")}
                      onEditSkill={(skill) => openEditor(skill, "fork")}
                      userId={userId}
                      initialFavoritesOnly
                    />
                  } />
                  <Route path="/create" element={
                    <AddSkillPage
                      key={location.key}
                      onBackHome={() => handleNavSelect("Home")}
                      userId={userId}
                      profile={profile}
                      onRequireProfile={requireProfile}
                      initialDescription={location.state?.seed ?? ""}
                      onGoToEditor={(skill) => openEditor(skill, "new")}
                      onOpenSkill={openSkill}
                    />
                  } />
                  <Route path="/create/editor" element={
                    <SkillEditor
                      key={location.key}
                      initialSkill={location.state?.skill ?? null}
                      mode={location.state?.mode ?? "new"}
                      userId={userId}
                      profile={profile}
                      onRequireProfile={requireProfile}
                      onBack={() => handleNavSelect("Home")}
                    />
                  } />
                  <Route path="/profile" element={
                    <ProfilePage
                      profile={profile}
                      userId={userId}
                      email={accountEmail}
                      isOnboarding={isOnboarding}
                      reason={location.state?.profileReason ?? null}
                      onSaved={(updated) => {
                        setProfile(updated);
                        setIsOnboarding(false);
                        handleNavSelect("Home");
                      }}
                      onSkip={() => handleNavSelect("Home")}
                    />
                  } />
                  <Route path="/settings" element={settingsPage()} />
                  <Route path="/settings/:section" element={settingsPage()} />
                  <Route path="/appearance" element={settingsPage()} />
                  <Route path="/updates" element={<AccountOptionPage title="Updates" description="You are up to date. New product and skill updates will appear here." />} />
                  <Route path="/accessibility" element={<AccountOptionPage title="Accessibility" description="Accessibility preferences and guidance will appear here." />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </div>
            </div>

            <Footer />
          </div>

          {leaveGuardModal}
          <FeedbackWidget />
        </div>
       </LeaveGuardContext.Provider>
      </BaseStyles>
    </ThemeProvider>
  );

  function settingsPage() {
    return (
      <SettingsPage
        key={`${profile?.id ?? "loading-profile"}-${settingsSection}`}
        profile={profile}
        userId={userId}
        email={accountEmail}
        onSaved={setProfile}
        initialSection={settingsSection}
        onSectionChange={openSettings}
        appearance={appearancePreview ?? appearance}
        onPreviewAppearance={setAppearancePreview}
        onSaveAppearance={commitAppearance}
      />
    );
  }
}

function AccountOptionPage({ title, description }) {
  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
    </main>
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