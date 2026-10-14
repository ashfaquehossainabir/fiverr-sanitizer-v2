// Shortcut labels that match the user's keyboard: ⌘ on Apple devices, Ctrl elsewhere.
export const isApple =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

export const MOD = isApple ? "⌘" : "Ctrl";

// True while the user is typing in a field, so single-key shortcuts don't hijack typing.
export function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}
