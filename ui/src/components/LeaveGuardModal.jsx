import { useEffect } from "react";
import "./LeaveGuard.css";

// The confirmation dialog shown by the navigation leave-guard. Copy is passed
// in (keyed by the leaving page's intent constant) so this stays presentational.
// Kept in its own file so fast refresh sees a component-only module.
export default function LeaveGuardModal({ copy, onConfirm, onCancel }) {
  // Escape cancels, matching the app's other dismissible surfaces.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="leaveguard__overlay" onClick={onCancel}>
      <div
        className="leaveguard__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leaveguard-title"
        aria-describedby="leaveguard-body"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="leaveguard-title" className="leaveguard__title">
          {copy.title}
        </h2>
        <p id="leaveguard-body" className="leaveguard__body">
          {copy.body}
        </p>
        <div className="leaveguard__actions">
          <button
            type="button"
            className="leaveguard__btn leaveguard__btn--ghost"
            onClick={onCancel}
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            className="leaveguard__btn leaveguard__btn--danger"
            onClick={onConfirm}
            autoFocus
          >
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
