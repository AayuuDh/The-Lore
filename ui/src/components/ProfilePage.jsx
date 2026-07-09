import { useState } from "react";
import { ArrowLeftIcon, PersonIcon, SyncIcon } from "@primer/octicons-react";
import { updateProfile } from "../api";
import "./ProfilePage.css";

// The profile / onboarding screen. Shown right after first sign-in (onboarding
// mode) and any time the user opens "Profile" from the nav.
//
// Rules the UI enforces (mirrored by the backend):
//   - Everyone gets an auto-generated anonymous username they can change.
//   - Contact details (email / phone / other) are OPTIONAL and can be skipped.
//   - To ADD skills you must have a username (always true) AND have chosen
//     whether you're willing to be contacted. So the contact choice is the one
//     thing we nudge people to set, but they can still skip during onboarding.
//
// Props:
//   profile        - the current profile object from the backend
//   userId         - the signed-in user's stable id (for PATCH calls)
//   onSaved(p)     - called with the updated profile after a successful save
//   onSkip         - leave without saving (goes home)
//   isOnboarding   - true right after first sign-in; tweaks the copy/buttons
//   reason         - optional string explaining why they were sent here
function ProfilePage({ profile, userId, onSaved, onSkip, isOnboarding, reason }) {
  const [username, setUsername] = useState(profile?.username ?? "");
  // contactable is a tri-state: null (undecided) | true | false.
  const [contactable, setContactable] = useState(profile?.contactable ?? null);
  const [email, setEmail] = useState(profile?.contact_email ?? "");
  const [phone, setPhone] = useState(profile?.contact_phone ?? "");
  const [other, setOther] = useState(profile?.contact_other ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
        contact_email: email,
        contact_phone: phone,
        contact_other: other,
      });
      onSaved(updated);
    } catch (err) {
      // 409 = the chosen username is taken; the backend detail already says so.
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
            <ArrowLeftIcon size={16} />
            <span>Back to Home</span>
          </button>
        )}

        <section className="profile-page__hero">
          <div className="profile-page__avatar">
            <PersonIcon size={28} />
          </div>
          <p className="profile-page__eyebrow">
            {isOnboarding ? "Welcome" : "Your profile"}
          </p>
          <h1 className="profile-page__title">
            {isOnboarding ? "Set up your profile" : "Profile"}
          </h1>
          <p className="profile-page__subtitle">
            You&apos;re known here by an anonymous handle &mdash; never your real name
            or alias. Everything except the username is optional and can be skipped.
          </p>

          {reason && <div className="profile-page__notice">{reason}</div>}
          {error && <div className="profile-page__error">{error}</div>}

          <div className="profile-page__card">
            <label className="profile-page__field">
              <span className="profile-page__label">
                Username <span className="profile-page__required">required</span>
              </span>
              <input
                className="profile-page__input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="AnonymousPanda"
                maxLength={40}
                aria-label="Username"
              />
              <span className="profile-page__hint">
                Auto-generated for you. Change it to any unused handle you like.
              </span>
            </label>

            <div className="profile-page__field">
              <span className="profile-page__label">
                Would you like to be contacted?
                <span className="profile-page__required">required to add skills</span>
              </span>
              <span className="profile-page__hint">
                If someone wants to use one of your skills, may we let them reach you?
              </span>
              <div className="profile-page__choice-row">
                <button
                  type="button"
                  className={`profile-page__choice ${contactable === true ? "profile-page__choice--active" : ""}`}
                  onClick={() => setContactable(true)}
                >
                  Yes, I&apos;m open to it
                </button>
                <button
                  type="button"
                  className={`profile-page__choice ${contactable === false ? "profile-page__choice--active" : ""}`}
                  onClick={() => setContactable(false)}
                >
                  No, keep me private
                </button>
              </div>
            </div>

            {/* Contact details are only meaningful if they're open to contact. */}
            {contactable === true && (
              <>
                <label className="profile-page__field">
                  <span className="profile-page__label">Email (optional)</span>
                  <input
                    className="profile-page__input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>

                <label className="profile-page__field">
                  <span className="profile-page__label">Phone (optional)</span>
                  <input
                    className="profile-page__input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                  />
                </label>

                <label className="profile-page__field">
                  <span className="profile-page__label">Anything else (optional)</span>
                  <textarea
                    className="profile-page__textarea"
                    rows={2}
                    value={other}
                    onChange={(e) => setOther(e.target.value)}
                    placeholder="Best way / times to reach you, Teams handle, etc."
                  />
                </label>
              </>
            )}

            <div className="profile-page__actions">
              <button
                className="profile-page__save-btn"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <SyncIcon size={16} /> Saving...
                  </>
                ) : (
                  "Save profile"
                )}
              </button>
              <button
                className="profile-page__skip-btn"
                type="button"
                onClick={onSkip}
                disabled={saving}
              >
                {isOnboarding ? "Skip for now" : "Cancel"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ProfilePage;
