import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import LeaveGuardModal from "./LeaveGuardModal";

// ---------------------------------------------------------------------------
// A general "you have unsaved work — leave anyway?" guard for navigation.
//
// The problem it solves: several places send the user to /home (the TopNav
// logo, the sidebar's Home item, per-page "back home" buttons). When the home
// page is mid-conversation, going there used to leave the old conversation in
// place (it lives in sessionStorage), so the user felt stuck. This lets a page
// declare — with a CONSTANT — that it currently holds abandonable state, and
// have any home navigation first pop a confirmation modal whose wording is
// keyed off that constant. Confirming runs the page's own reset.
//
// To cover a new surface (e.g. an unsaved draft): add an ABANDON_INTENTS key,
// a matching ABANDON_COPY entry, and one useLeaveGuard(...) call in that page.
// ---------------------------------------------------------------------------

// The constants a page sets to pick which confirmation copy the modal shows.
export const ABANDON_INTENTS = {
  DISCOVER_CONVERSATION: "discover-conversation",
};

// Per-intent modal strings. `default` is the fallback for an unknown key so a
// mis-typed / not-yet-added intent still yields a sensible dialog.
const ABANDON_COPY = {
  [ABANDON_INTENTS.DISCOVER_CONVERSATION]: {
    title: "Leave this conversation?",
    body: "Going home clears your current conversation and any skills it surfaced. This can't be undone.",
    confirm: "Leave & start over",
    cancel: "Keep talking",
  },
  default: {
    title: "Leave this page?",
    body: "You have unsaved changes that will be lost if you leave now.",
    confirm: "Leave",
    cancel: "Stay",
  },
};

const copyFor = (intent) => ABANDON_COPY[intent] ?? ABANDON_COPY.default;

// Carries the register/unregister functions down to descendant pages.
export const LeaveGuardContext = createContext(null);

// Called once by App. Owns the registry of active guards and the pending
// navigation, and hands back the pieces App wires up:
//   - requestLeave(proceed): call instead of navigating home directly
//   - contextValue: put on <LeaveGuardContext.Provider value={...}>
//   - modal: render inside the themed app container
export function useLeaveGuardController() {
  // id -> ref holding { intent, isActive, onAbandon }. We keep the *ref* (not a
  // snapshot) so requestLeave always reads a page's latest predicate/callback
  // without the page having to re-register on every render.
  const guardsRef = useRef(new Map());
  // The navigation waiting on a confirm: { intent, proceed, onAbandon } | null.
  const [pending, setPending] = useState(null);

  const registerGuard = useCallback((id, guardRef) => {
    guardsRef.current.set(id, guardRef);
  }, []);
  const unregister = useCallback((id) => {
    guardsRef.current.delete(id);
  }, []);

  // Attempt a navigation. If any registered guard is currently active, hold the
  // navigation and open the modal; otherwise let it through immediately.
  const requestLeave = useCallback((proceed) => {
    let active = null;
    for (const ref of guardsRef.current.values()) {
      if (ref.current?.isActive) {
        active = ref.current;
        break;
      }
    }
    if (!active) {
      proceed();
      return;
    }
    setPending({ intent: active.intent, onAbandon: active.onAbandon, proceed });
  }, []);

  const confirmLeave = useCallback(() => {
    if (!pending) return;
    pending.onAbandon?.();
    pending.proceed?.();
    setPending(null);
  }, [pending]);
  const cancelLeave = useCallback(() => setPending(null), []);

  const contextValue = useMemo(
    () => ({ registerGuard, unregister }),
    [registerGuard, unregister]
  );

  const modal = pending ? (
    <LeaveGuardModal
      copy={copyFor(pending.intent)}
      onConfirm={confirmLeave}
      onCancel={cancelLeave}
    />
  ) : null;

  return { requestLeave, contextValue, modal };
}

// Registered by a page that holds abandonable state.
//   intent   — one of ABANDON_INTENTS, selects the modal copy
//   isActive — true while there is something worth confirming (e.g. a live chat)
//   onAbandon — reset run when the user confirms leaving
export function useLeaveGuard(intent, isActive, onAbandon) {
  const ctx = useContext(LeaveGuardContext);
  const id = useId();
  // Latest values, read by requestLeave at click time — avoids stale closures
  // and re-registering as the page's state changes. Written in an effect (not
  // during render) so it stays a pure render.
  const latest = useRef({ intent, isActive, onAbandon });
  useEffect(() => {
    latest.current = { intent, isActive, onAbandon };
  });

  useEffect(() => {
    if (!ctx) return undefined;
    ctx.registerGuard(id, latest);
    return () => ctx.unregister(id);
  }, [ctx, id]);
}
