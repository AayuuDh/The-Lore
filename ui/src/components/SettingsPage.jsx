import { useState } from "react";
import {
  CheckIcon,
  EyeClosedIcon,
  GearIcon,
  MoonIcon,
  PaintbrushIcon,
  PersonIcon,
  ShieldIcon,
  SunIcon,
  SyncIcon,
} from "@primer/octicons-react";
import { updateProfile } from "../api";
import "./SettingsPage.css";

const SETTINGS_NAV = [
  { id: "general", label: "General", icon: GearIcon },
  { id: "appearance", label: "Appearance", icon: PaintbrushIcon },
  { id: "profile", label: "Public profile", icon: PersonIcon },
  { id: "privacy", label: "Privacy", icon: ShieldIcon },
];

const THEMES = [
  {
    id: "purple",
    name: "Default Purple",
    description: "Deep violet gradients with softly glowing purple cubes.",
  },
  {
    id: "m365",
    name: "Spectrum",
    description: "A bright spectrum with colorful cubes.",
  },
];

function SettingsPage({
  profile,
  userId,
  onSaved,
  initialSection = "general",
  onSectionChange,
  appearance,
  onPreviewAppearance,
  onSaveAppearance,
}) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [contactable, setContactable] = useState(profile?.contactable ?? false);
  const [emailAddress, setEmailAddress] = useState(profile?.contact_email ?? "");
  const [phone, setPhone] = useState(profile?.contact_phone ?? "");
  const [other, setOther] = useState(profile?.contact_other ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave(event) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("A username is required.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const updated = await updateProfile(userId, {
        username: trimmedUsername,
        contactable,
        contact_email: emailAddress,
        contact_phone: phone,
        contact_other: other,
      });
      onSaved(updated);
      onSaveAppearance(appearance);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message || "Could not save your settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <h1>Settings</h1>
        <p>Manage your account identity, profile, and collaboration preferences.</p>
      </header>

      <div className="settings-page__layout">
        <nav className="settings-page__nav" aria-label="Settings navigation">
          {SETTINGS_NAV.map(({ id, label, icon: Icon }) => (
            <button
              className={activeSection === id ? "settings-page__nav-item settings-page__nav-item--active" : "settings-page__nav-item"}
              key={id}
              onClick={() => {
                setActiveSection(id);
                onSectionChange?.(id);
              }}
              type="button"
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <form className="settings-page__content" onSubmit={handleSave}>
          {error && <div className="settings-page__message settings-page__message--error" role="alert">{error}</div>}
          {saved && <div className="settings-page__message settings-page__message--success" role="status"><CheckIcon size={16} /> Settings saved.</div>}

          {activeSection === "general" && <section className="settings-page__section" id="settings-general">
            <div className="settings-page__section-heading">
              <h2>General</h2>
              <p>Your local Lore profile.</p>
            </div>
            <div className="settings-page__row">
              <div><h3>Local session</h3><p>No external account is connected.</p></div>
              <span className="settings-page__status">Active</span>
            </div>
            <div className="settings-page__row">
              <div><h3>Local alias</h3><p>Used to identify this browser profile.</p></div>
              <code>{profile?.nickname || "Loading..."}</code>
            </div>
          </section>}

          {activeSection === "appearance" && <section className="settings-page__section" id="settings-appearance">
            <div className="settings-page__section-heading">
              <h2>Appearance</h2>
              <p>Preview a theme and mode. Your choice is kept only after you save changes.</p>
            </div>

            <fieldset className="settings-page__theme-fieldset">
              <legend>Theme</legend>
              <div className="settings-page__theme-grid">
                {THEMES.map((theme) => (
                  <label
                    className={`settings-page__theme-card${appearance.theme === theme.id ? " settings-page__theme-card--selected" : ""}`}
                    key={theme.id}
                  >
                    <input
                      checked={appearance.theme === theme.id}
                      name="appearance-theme"
                      onChange={() => onPreviewAppearance({ ...appearance, theme: theme.id })}
                      type="radio"
                      value={theme.id}
                    />
                    <span className={`settings-page__theme-preview settings-page__theme-preview--${theme.id}`} aria-hidden="true">
                      <i /><i /><i /><i />
                    </span>
                    <span className="settings-page__theme-copy">
                      <strong>{theme.name}</strong>
                      <small>{theme.description}</small>
                    </span>
                    {appearance.theme === theme.id && <CheckIcon className="settings-page__theme-check" size={18} />}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="settings-page__mode-fieldset">
              <legend>Mode</legend>
              <div className="settings-page__mode-control">
                <label className={appearance.mode === "dark" ? "is-selected" : ""}>
                  <input
                    checked={appearance.mode === "dark"}
                    name="appearance-mode"
                    onChange={() => onPreviewAppearance({ ...appearance, mode: "dark" })}
                    type="radio"
                    value="dark"
                  />
                  <MoonIcon size={16} /> Dark
                </label>
                <label className={appearance.mode === "light" ? "is-selected" : ""}>
                  <input
                    checked={appearance.mode === "light"}
                    name="appearance-mode"
                    onChange={() => onPreviewAppearance({ ...appearance, mode: "light" })}
                    type="radio"
                    value="light"
                  />
                  <SunIcon size={16} /> Light
                </label>
              </div>
            </fieldset>
          </section>}

          {activeSection === "profile" && <section className="settings-page__section" id="settings-profile">
            <div className="settings-page__section-heading">
              <h2>Public profile</h2>
              <p>These details identify you to people using The Lore.</p>
            </div>
            <label className="settings-page__field">
              <span>Username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={40} placeholder="your-username" />
              <small>This is public and must be unique.</small>
            </label>
          </section>}

          {activeSection === "privacy" && <section className="settings-page__section" id="settings-privacy">
            <div className="settings-page__section-heading">
              <h2>Privacy and collaboration</h2>
              <p>Choose whether people can contact you about your published skills.</p>
            </div>
            <label className="settings-page__toggle">
              <input type="checkbox" checked={contactable} onChange={(event) => setContactable(event.target.checked)} />
              <span className="settings-page__toggle-control" aria-hidden="true" />
              <span><strong>Allow collaboration requests</strong><small>Share the contact details below only when someone asks about one of your skills.</small></span>
            </label>

            {contactable ? (
              <div className="settings-page__contact-grid">
                <label className="settings-page__field"><span>Contact email</span><input type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} placeholder="you@example.com" /></label>
                <label className="settings-page__field"><span>Phone</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" /></label>
                <label className="settings-page__field settings-page__field--wide"><span>Other contact details</span><textarea rows="3" value={other} onChange={(event) => setOther(event.target.value)} placeholder="Optional" /></label>
              </div>
            ) : (
              <div className="settings-page__private-note"><EyeClosedIcon size={16} /> Your contact details are private.</div>
            )}
          </section>}

          <div className="settings-page__actions">
            <button className="settings-page__save" type="submit" disabled={saving}>
              {saving ? <><SyncIcon size={16} /> Saving...</> : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default SettingsPage;