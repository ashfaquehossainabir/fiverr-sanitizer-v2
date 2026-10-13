// Lightweight, dependency-free writing helpers used by the editor's
// "Message Quality" panel. Everything runs locally in the browser.

const WORDS_PER_MINUTE = 200;

export function getMessageStats(text) {
  const clean = (text || "").trim();
  if (!clean) {
    return { words: 0, sentences: 0, readSeconds: 0, avgSentence: 0, longSentences: 0 };
  }
  const words = clean.split(/\s+/).filter(Boolean).length;
  const sentenceList = clean.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const longSentences = sentenceList.filter((s) => s.split(/\s+/).length > 28).length;
  return {
    words,
    sentences: sentenceList.length,
    readSeconds: Math.max(1, Math.round((words / WORDS_PER_MINUTE) * 60)),
    avgSentence: Math.round(words / Math.max(1, sentenceList.length)),
    longSentences
  };
}

const GREETING = /^(hi|hello|hey|dear|good (morning|afternoon|evening)|greetings)\b/i;
const THANKS = /\b(thank you|thanks|appreciate|grateful)\b/i;
const POLITE = /\b(please|kindly|could you|would you|happy to|glad to)\b/i;
const CLOSING = /\b(best regards|kind regards|regards|sincerely|cheers|looking forward|talk soon)\b/i;
const QUESTION_TO_ACTION = /\?|let me know|please (send|share|confirm|provide)/i;

// Returns a list of {id, ok, label} checks so the UI can render a checklist.
export function getToneChecks(text) {
  const clean = (text || "").trim();
  if (!clean) return [];
  const first = clean.split("\n")[0];
  const shouting = (clean.match(/\b[A-Z]{4,}\b/g) || []).length;
  const exclaims = (clean.match(/!/g) || []).length;
  return [
    { id: "greeting", ok: GREETING.test(first), label: "Starts with a greeting" },
    { id: "polite", ok: POLITE.test(clean) || THANKS.test(clean), label: "Polite wording (please, thanks…)" },
    { id: "cta", ok: QUESTION_TO_ACTION.test(clean), label: "Clear next step or question" },
    { id: "closing", ok: CLOSING.test(clean), label: "Friendly sign-off" },
    { id: "calm", ok: shouting === 0 && exclaims <= 3, label: "No ALL-CAPS or excess “!”" }
  ];
}

export function formatReadTime(seconds) {
  if (seconds < 60) return `${seconds}s read`;
  return `${Math.round(seconds / 60)} min read`;
}
