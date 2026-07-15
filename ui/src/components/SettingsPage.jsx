import { useState } from "react";
import {
  CheckIcon,
  EyeClosedIcon,
  GearIcon,
  PersonIcon,
  ShieldIcon,
  SyncIcon,
} from "@primer/octicons-react";
import { updateProfile } from "../api";
import "./SettingsPage.css";

const SETTINGS_NAV = [
  { id: "general", label: "General", icon: GearIcon },
  { id: "profile", label: "Public profile", icon: PersonIcon },
  { id: "privacy", label: "Privacy", icon: ShieldIcon },
];

function SettingsPage({ profile, userId, email, onSaved }) {
  const [activeSection, setActiveSection] = useState("general");
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
                document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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

          <section className="settings-page__section" id="settings-general">
            <div className="settings-page__section-heading">
              <h2>General</h2>
              <p>Your signed-in account and Lore identity.</p>
            </div>
            <div className="settings-page__row">
              <div><h3>Microsoft account</h3><p>{email || "No account email available"}</p></div>
              <span className="settings-page__status">Connected</span>
            </div>
            <div className="settings-page__row">
              <div><h3>Anonymous alias</h3><p>Used internally to keep your sign-in identity private.</p></div>
              <code>{profile?.nickname || "Loading..."}</code>
            </div>
          </section>

          <section className="settings-page__section" id="settings-profile">
            <div className="settings-page__section-heading">
              <h2>Public profile</h2>
              <p>These details identify you to people using The Lore.</p>
            </div>
            <label className="settings-page__field">
              <span>Username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={40} placeholder="your-username" />
              <small>This is public and must be unique.</small>
            </label>
          </section>

          <section className="settings-page__section" id="settings-privacy">
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
          </section>

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