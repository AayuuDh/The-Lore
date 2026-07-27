import { useEffect, useState } from "react";
import { ArrowLeftIcon, PencilIcon, SyncIcon } from "@primer/octicons-react";
import { updateProfile, getMySkills, getMyHistory } from "../api";
import { getFavorites } from "../favorites";
import "./ProfilePage.css";

const ACTIVITY_TYPES = [
  { label: "Skills added", key: "added", color: "#3fb950" },
  { label: "Skills used", key: "used", color: "#58a6ff" },
  { label: "Skills favorited", key: "favorited", color: "#d2a8ff" },
];

// Turn the user's authored skills, event history, and saved favorites into the
// three headline counts. Downloads and copies are both logged as "use" events;
// favorites live in localStorage (the app's source of truth, shared with the
// sidebar), so we read them from there rather than from backend events.
function computeStats(mySkills, history, favorites) {
  let used = 0;
  for (const event of history || []) {
    if (event.type === "use") used += 1;
  }
  return {
    added: (mySkills || []).length,
    used,
    favorited: (favorites || []).length,
  };
}

function ProfilePage({ profile, userId, email, onSaved, onSkip, isOnboarding, reason }) {
  const [editing, setEditing] = useState(isOnboarding);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [contactable, setContactable] = useState(profile?.contactable ?? null);
  const [emailAddress, setEmailAddress] = useState(profile?.contact_email ?? "");
  const [phone, setPhone] = useState(profile?.contact_phone ?? "");
  const [other, setOther] = useState(profile?.contact_other ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Load real activity counts for this user. Both calls degrade to empty lists
  // (e.g. local dev without Cosmos), so the stats simply read as zero.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.all([
      getMySkills(userId).catch(() => []),
      getMyHistory(userId).catch(() => []),
    ]).then(([mySkills, history]) => {
      if (active) setStats(computeStats(mySkills, history, getFavorites()));
    });
    return () => {
      active = false;
    };
  }, [userId]);

  async function handleSave() {
    const trimmed = username.trim();
    if (!trimmed) {
      setError("A username is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(userId, {
        username: trimmed,
        contactable,
        contact_email: emailAddress,
        contact_phone: phone,
        contact_other: other,
      });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <main className="profile-page__main">
        {!isOnboarding && (
          <button className="profile-page__back" onClick={onSkip}>
            <ArrowLeftIcon size={16} /> Back to Home
          </button>
        )}

        <aside className="profile-page__sidebar">
          <div className="profile-page__avatar" aria-label="Profile photo placeholder" />
          <h1>@{profile?.username || "username"}</h1>
          <p className="profile-page__email">{email || "No account email available"}</p>
          <button className="profile-page__edit-button" type="button" onClick={() => setEditing(true)}>
            <PencilIcon size={15} /> Edit profile
          </button>
        </aside>

        <div className="profile-page__content">
          {reason && <div className="profile-page__notice">{reason}</div>}
          {error && <div className="profile-page__error">{error}</div>}

          <section className="profile-page__summary" aria-label="Skill activity summary">
            {ACTIVITY_TYPES.map(({ label, key, color }) => (
              <div className="profile-page__stat" key={key}>
                <span className="profile-page__stat-dot" style={{ backgroundColor: color }} />
                <strong>{stats ? stats[key] : "—"}</strong>
                <span>{label}</span>
              </div>
            ))}
          </section>

          {editing && (
            <section className="profile-page__editor" aria-labelledby="profile-editor-title">
              <div className="profile-page__editor-heading">
                <div>
                  <h2 id="profile-editor-title">Edit profile</h2>
                  <p>Your username is public and can be changed at any time.</p>
                </div>
                {!isOnboarding && <button type="button" className="profile-page__close-button" onClick={() => setEditing(false)}>Cancel</button>}
              </div>

              <label className="profile-page__field">
                <span>Username</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="your-username" maxLength={40} />
              </label>

              <div className="profile-page__field">
                <span>Available for collaboration</span>
                <div className="profile-page__choice-row">
                  <button type="button" className={contactable === true ? "profile-page__choice profile-page__choice--active" : "profile-page__choice"} onClick={() => setContactable(true)}>Yes, I&apos;m open to it</button>
                  <button type="button" className={contactable === false ? "profile-page__choice profile-page__choice--active" : "profile-page__choice"} onClick={() => setContactable(false)}>No, keep me private</button>
                </div>
              </div>

              {contactable === true && (
                <div className="profile-page__contact-fields">
                  <label className="profile-page__field"><span>Contact email</span><input type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} /></label>
                  <label className="profile-page__field"><span>Phone</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
                  <label className="profile-page__field"><span>Other contact details</span><textarea rows={2} value={other} onChange={(event) => setOther(event.target.value)} /></label>
                </div>
              )}

              <button className="profile-page__save-button" type="button" onClick={handleSave} disabled={saving}>
                {saving ? <><SyncIcon size={16} /> Saving...</> : "Save changes"}
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
