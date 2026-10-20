import { useEffect, useMemo, useRef } from "react";
import FocusCard from "./FocusCard.jsx";
import { IconArrow, IconCalendar } from "./icons.jsx";
import useEscape from "../hooks/useEscape.js";

// Opens from the floating focus pill: shows the live timer in a dialog, plus a shortcut to the Planner tab.
export default function FocusTimerModal({ timer, tasks, onClose, onOpenPlanner }) {
  const openTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const closeRef = useRef(null);

  useEscape(onClose);

  useEffect(() => {
    closeRef.current?.focus();
    // Keep the page behind the dialog from scrolling while it is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="confirm-backdrop focus-modal-backdrop" onClick={onClose}>
      <div className="modal focus-modal" role="dialog" aria-modal="true" aria-labelledby="focus-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="focus-modal-head">
          <h3 id="focus-modal-title">Focus timer</h3>
          <button ref={closeRef} type="button" className="modal-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <FocusCard timer={timer} openTasks={openTasks} variant="modal" />

        <button type="button" className="btn-ghost focus-modal-planner" onClick={onOpenPlanner}>
          <IconCalendar size={16} />
          <span>Go to Planner</span>
          <IconArrow size={16} />
        </button>
      </div>
    </div>
  );
}
