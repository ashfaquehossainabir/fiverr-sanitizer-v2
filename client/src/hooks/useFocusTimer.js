import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const PRESETS = [
  { id: "quick", label: "15 / 3", focus: 15, rest: 3 },
  { id: "classic", label: "25 / 5", focus: 25, rest: 5 },
  { id: "deep", label: "50 / 10", focus: 50, rest: 10 }
];

const presetOf = (id) => PRESETS.find((p) => p.id === id) || PRESETS[1];
const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const lengthMs = (preset, mode) => (mode === "focus" ? presetOf(preset).focus : presetOf(preset).rest) * 60000;

const FRESH = { preset: "classic", mode: "focus", running: false, endsAt: null, remainingMs: null, taskId: null, day: dayKey(), sessions: 0, minutes: 0 };

function load(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    if (raw && typeof raw === "object") return { ...FRESH, ...raw };
  } catch {
    /* ignore corrupt data */
  }
  return { ...FRESH };
}

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.22].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.4);
    });
    setTimeout(() => ctx.close?.(), 1000);
  } catch {
    /* audio is a nicety */
  }
}

/**
 * Pomodoro-style focus timer. Lives in the dashboard so it keeps running while you
 * move between pages, survives a refresh (state is stored with an end timestamp,
 * not a counter) and shows the time left in the browser tab title.
 */
export default function useFocusTimer(userId, onComplete) {
  const storageKey = `sanitizer_focus_${userId || "anon"}`;
  const [state, setState] = useState(() => load(storageKey));
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* storage can be unavailable (private mode) */
    }
  }, [state, storageKey]);

  const finish = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    const p = presetOf(s.preset);
    chime();
    if (s.mode === "focus") {
      const base = s.day === dayKey() ? s : { ...s, sessions: 0, minutes: 0 };
      setState({
        ...base,
        day: dayKey(),
        sessions: base.sessions + 1,
        minutes: base.minutes + p.focus,
        mode: "break",
        running: true,
        endsAt: Date.now() + p.rest * 60000,
        remainingMs: null
      });
      completeRef.current?.({ kind: "focus", taskId: s.taskId, minutes: p.focus, restMinutes: p.rest });
    } else {
      setState({ ...s, mode: "focus", running: false, endsAt: null, remainingMs: null });
      completeRef.current?.({ kind: "break" });
    }
  }, []);

  useEffect(() => {
    if (!state.running) return undefined;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= (stateRef.current.endsAt || 0)) finish();
    }, 500);
    return () => clearInterval(id);
  }, [state.running, finish]);

  const remainingMs = state.running
    ? Math.max(0, (state.endsAt || 0) - now)
    : state.remainingMs ?? lengthMs(state.preset, state.mode);
  const totalMs = lengthMs(state.preset, state.mode);

  // Tab title: remember the original once, then keep the countdown fresh.
  const originalTitle = useRef(null);
  useEffect(() => {
    if (!state.running) return undefined;
    originalTitle.current = document.title;
    return () => {
      document.title = originalTitle.current;
    };
  }, [state.running]);
  useEffect(() => {
    if (state.running) document.title = `${formatClock(remainingMs)} · ${state.mode === "focus" ? "Focus" : "Break"}`;
  }, [state.running, state.mode, remainingMs]);

  const start = useCallback((taskId) => {
    const s = stateRef.current;
    const n = Date.now();
    setNow(n);
    setState({
      ...s,
      running: true,
      endsAt: n + (s.remainingMs ?? lengthMs(s.preset, s.mode)),
      remainingMs: null,
      taskId: taskId === undefined ? s.taskId : taskId
    });
  }, []);

  // "Focus on this task": retarget a running focus session, resume a paused one, or
  // start a fresh one (cutting a break short).
  const focusOn = useCallback((taskId) => {
    const s = stateRef.current;
    if (s.running && s.mode === "focus") {
      setState({ ...s, taskId });
      return;
    }
    const n = Date.now();
    setNow(n);
    const resume = s.mode === "focus" ? s.remainingMs : null;
    setState({ ...s, mode: "focus", running: true, endsAt: n + (resume ?? lengthMs(s.preset, "focus")), remainingMs: null, taskId });
  }, []);

  const pause = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    setState({ ...s, running: false, remainingMs: Math.max(0, (s.endsAt || 0) - Date.now()), endsAt: null });
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, mode: "focus", running: false, endsAt: null, remainingMs: null }));
  }, []);

  const setPreset = useCallback((id) => {
    setState((s) => (s.running ? s : { ...s, preset: id, remainingMs: null }));
  }, []);

  const setTask = useCallback((taskId) => setState((s) => ({ ...s, taskId: taskId || null })), []);

  const today = state.day === dayKey();

  return useMemo(
    () => ({
      mode: state.mode,
      running: state.running,
      paused: !state.running && state.remainingMs !== null,
      preset: state.preset,
      taskId: state.taskId,
      remainingMs,
      progress: totalMs ? 1 - remainingMs / totalMs : 0,
      sessionsToday: today ? state.sessions : 0,
      minutesToday: today ? state.minutes : 0,
      start,
      focusOn,
      pause,
      reset,
      setPreset,
      setTask
    }),
    [state, remainingMs, totalMs, today, start, focusOn, pause, reset, setPreset, setTask]
  );
}
