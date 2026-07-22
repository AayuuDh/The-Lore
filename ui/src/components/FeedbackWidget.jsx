import { useEffect, useState } from "react";
import { CommentDiscussionIcon } from "@primer/octicons-react";
import { TEAMS_CHAT_URL } from "../config";
import "./FeedbackWidget.css";

// A small round button that floats in the lower-right corner. Clicking it opens
// a confirm dialog inviting the user to join the Teams chat to give feedback;
// confirming opens TEAMS_CHAT_URL (a build-time parameter — see src/config.js)
// in a new tab.
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);

  // Escape closes the dialog, matching the app's other dismissible surfaces.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const joinChat = () => {
    window.open(TEAMS_CHAT_URL, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="feedback-fab"
        aria-label="Give feedback"
        title="Give feedback"
        onClick={() => setOpen(true)}
      >
        <CommentDiscussionIcon size={22} />
      </button>

      {open && (
        <div className="feedback-modal__overlay" onClick={() => setOpen(false)}>
          <div
            className="feedback-modal__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            aria-describedby="feedback-modal-body"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="feedback-modal-title" className="feedback-modal__title">
              Share your feedback
            </h2>
            <p id="feedback-modal-body" className="feedback-modal__body">
              Want to help shape The Lore? Join our Teams chat to share feedback
              and ideas with the team.
            </p>
            <div className="feedback-modal__actions">
              <button
                type="button"
                className="feedback-modal__btn feedback-modal__btn--ghost"
                onClick={() => setOpen(false)}
              >
                Not now
              </button>
              <button
                type="button"
                className="feedback-modal__btn feedback-modal__btn--primary"
                onClick={joinChat}
                autoFocus
              >
                Join the Teams chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
