import { useState } from "react";
import { PlusIcon, ArrowLeftIcon } from "@primer/octicons-react";
import "./AddSkillPage.css";

function SkillInput({ value, onChange, onSubmit }) {
  return (
    <form className="add-skill-page__input-row" onSubmit={onSubmit}>
      <input
        className="add-skill-page__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. React, Figma, Public Speaking..."
        aria-label="What skill would you like to add?"
      />
      <button className="add-skill-page__start-btn" type="submit">
        Start
      </button>
    </form>
  );
}

function AddSkillPage({ onBackHome }) {
  const [skill, setSkill] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
  }

  return (
    <div className="add-skill-page">
      <aside className="add-skill-page__sidebar">
        <div className="add-skill-page__sidebar-header">
          <span className="add-skill-page__sidebar-title">My Skills</span>
          <button className="add-skill-page__plus-btn" type="button" aria-label="Add skill">
            <PlusIcon size={18} />
          </button>
        </div>
        <div className="add-skill-page__sidebar-empty">Skills you add will appear here</div>
      </aside>

      <main className="add-skill-page__main">
        <button className="add-skill-page__back" onClick={onBackHome}>
          <ArrowLeftIcon size={16} />
          <span>Back to Home</span>
        </button>

        <section className="add-skill-page__hero">
          <p className="add-skill-page__eyebrow">Skill builder</p>
          <h1 className="add-skill-page__title">Add a Skill</h1>
          <p className="add-skill-page__subtitle">
            Tell me a skill and I&apos;ll help you showcase it perfectly
          </p>

          <div className="add-skill-page__card">
            <h2 className="add-skill-page__question">What skill would you like to add?</h2>
            <p className="add-skill-page__helptext">
              Type any skill - technical, creative, or interpersonal. I&apos;ll ask a few quick questions to help you describe it well.
            </p>

            <SkillInput value={skill} onChange={setSkill} onSubmit={handleSubmit} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default AddSkillPage;