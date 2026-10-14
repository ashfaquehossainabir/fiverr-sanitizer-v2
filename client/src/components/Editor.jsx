import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeText } from "../lib/sanitizer.js";
import { getGrammarSuggestions } from "../lib/grammarSuggestions.js";
import { getPhoneWarnings, getReservedWarnings } from "../lib/utility/reservedWarnings.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatReadTime, getMessageStats, getToneChecks } from "../lib/messageStats.js";
import { useToast } from "../context/ToastContext.jsx";
import TemplatePicker from "./TemplatePicker.jsx";
import { IconPaste, IconTemplate, IconSave } from "./icons.jsx";
import { MOD } from "../lib/platform.js";

const URL_REGEX = /\bhttps?:\/\/[^\s]+/gi;
const CHAR_LIMIT = 2500;
// Drafts are stored per account so a shared browser never shows one user's text to the next.
const draftKeyFor = (user) => `sanitizer_draft_${user?.id || user?._id || "anon"}`;
const SPEECH_SUPPORTED =
  typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

// User text is injected into the preview as HTML (so matches can be
// highlighted). Escape it first so pasted markup is shown, never executed.
const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function readDraft(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export default function Editor({
  onSaveMessage,
  saving,
  loadedText,
  insertRequest,
  clients = [],
  templates = [],
  onTemplateUsed,
  onManageTemplates
}) {
  const { notify } = useToast();
  const { user } = useAuth();
  const draftKey = draftKeyFor(user);
  const translateReq = useRef(0);
  const [translating, setTranslating] = useState(false);
  const textareaRef = useRef(null);
  const lastInsertId = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [input, setInput] = useState(() => readDraft(draftKey));
  const [debouncedInput, setDebouncedInput] = useState(() => readDraft(draftKey));
  const [selectedClient, setSelectedClient] = useState("");
  const [previousText, setPreviousText] = useState(null);

  const [translatedText, setTranslatedText] = useState("");
  const [isTranslated, setIsTranslated] = useState(false);

  const [grammarSuggestions, setGrammarSuggestions] = useState([]);
  const [reservedWarnings, setReservedWarnings] = useState([]);

  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* -------------------- DEBOUNCE -------------------- */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 400);
    return () => clearTimeout(timer);
  }, [input]);

  /* Autosave the draft so a refresh or accidental tab close never loses work. */
  useEffect(() => {
    try {
      if (input) localStorage.setItem(draftKey, input);
      else localStorage.removeItem(draftKey);
      localStorage.removeItem("sanitizer_draft"); // legacy shared key from older versions
    } catch {
      /* storage unavailable - drafts just won't persist */
    }
  }, [input, draftKey]);

  /* A client that was completed/archived (or deleted) since being picked is no
     longer in the list: unlink it so the message is not saved against it. */
  useEffect(() => {
    if (selectedClient && !clients.some((c) => c._id === selectedClient)) setSelectedClient("");
  }, [clients, selectedClient]);

  /* A template sent from the Templates view replaces the editor text. The
     previous text is kept so the swap can be undone with one click. */
  useEffect(() => {
    if (!loadedText?.id) return;
    setPreviousText(input.trim() ? input : null);
    setInput(loadedText.text);
    setDebouncedInput(loadedText.text);
    setIsTranslated(false);
    setTranslatedText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedText?.id]);

  /* Drops text at the caret (or replaces the selection). When the caret is at
     the very end of an existing draft the new text starts on its own paragraph. */
  const insertAtCursor = (text) => {
    const el = textareaRef.current;
    let start = el ? el.selectionStart : input.length;
    let end = el ? el.selectionEnd : input.length;
    start = Math.min(start ?? input.length, input.length);
    end = Math.min(end ?? input.length, input.length);
    const needsGap = input.trim() && start === input.length && end === input.length;
    const chunk = `${needsGap ? "\n\n" : ""}${text}`;
    const next = input.slice(0, start) + chunk + input.slice(end);
    setInput(next);
    setDebouncedInput(next);
    setIsTranslated(false);
    setTranslatedText("");
    const caret = start + chunk.length;
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (node) {
        node.focus();
        node.setSelectionRange(caret, caret);
      }
    });
  };

  /* A template picked from the command palette arrives as an insert request. */
  useEffect(() => {
    if (!insertRequest?.id || lastInsertId.current === insertRequest.id) return;
    lastInsertId.current = insertRequest.id;
    insertAtCursor(insertRequest.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertRequest?.id]);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        notify("Your clipboard is empty.", { tone: "error" });
        return;
      }
      insertAtCursor(text);
    } catch {
      notify("Could not read the clipboard. Allow access or paste with " + MOD + "+V.", { tone: "error", duration: 4000 });
    }
  };

  const handlePickTemplate = (text, template) => {
    setPickerOpen(false);
    insertAtCursor(text);
    onTemplateUsed?.(template._id);
    notify(`Inserted “${template.title}”`);
  };

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const normalizedInput = debouncedInput.trimStart();
  const hasRealText = normalizedInput.trim().length > 0;

  const { text: sanitized, emailRemoved } = hasRealText
    ? sanitizeText(normalizedInput)
    : { text: "", emailRemoved: false };

  const hasRealCharacter = /[a-zA-Z0-9]/.test(sanitized);
  const charCount = hasRealCharacter ? sanitized.length : 0;
  const wordCount = hasRealCharacter
    ? sanitized.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const isLimitExceeded = charCount > CHAR_LIMIT;
  const limitPct = Math.min(100, Math.round((charCount / CHAR_LIMIT) * 100));
  const limitTone = isLimitExceeded ? "over" : limitPct >= 80 ? "near" : "ok";
  const selectedClientObj = clients.find((c) => c._id === selectedClient) || null;

  const hasWarnings = reservedWarnings.length > 0 || emailRemoved;
  const stats = hasRealCharacter ? getMessageStats(sanitized) : null;
  const toneChecks = hasRealCharacter ? getToneChecks(sanitized) : [];

  useEffect(() => {
    if (!hasRealText) {
      setGrammarSuggestions([]);
      return;
    }
    setGrammarSuggestions(getGrammarSuggestions(normalizedInput));
  }, [debouncedInput]);

  useEffect(() => {
    if (!hasRealText) {
      setReservedWarnings([]);
      return;
    }
    const textWithoutUrls = normalizedInput.replace(URL_REGEX, "");
    setReservedWarnings([...getReservedWarnings(textWithoutUrls), ...getPhoneWarnings(textWithoutUrls)]);
  }, [debouncedInput]);

  /* Changing the text stops any reading in progress and resets the buttons. */
  useEffect(() => {
    return () => {
      if (!SPEECH_SUPPORTED) return;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    };
  }, [sanitized]);

  const applyGrammarFix = (fixedText) => {
    setInput(fixedText);
    setDebouncedInput(fixedText);
    setGrammarSuggestions([]);
    setIsTranslated(false);
    setTranslatedText("");
  };

  const clearText = () => {
    setInput("");
    setDebouncedInput("");
    setGrammarSuggestions([]);
    setReservedWarnings([]);
    setIsTranslated(false);
    setTranslatedText("");
  };

  const copyText = async () => {
    if (!hasRealText) return false;
    try {
      await navigator.clipboard.writeText(sanitized);
    } catch {
      notify("Copy failed. Select the preview text and copy it manually.", { tone: "error", duration: 4000 });
      return false;
    }
    setCopied(true);
    notify("Sanitized text copied");
    setTimeout(() => setCopied(false), 2000);
    return true;
  };

  const translateToBengali = async () => {
    // Second click flips back to the English preview.
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    if (!sanitized.trim() || translating) return;
    const requestId = ++translateReq.current;
    setTranslating(true);
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(
          sanitized
        )}`
      );
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      const translated = data[0].map((item) => item?.[0] || "").join("");
      if (requestId !== translateReq.current) return; // text changed while waiting
      setTranslatedText(translated);
      setIsTranslated(true);
    } catch {
      if (requestId === translateReq.current) notify("Translation failed. Please try again.", { tone: "error" });
    } finally {
      if (requestId === translateReq.current) setTranslating(false);
    }
  };

  const startReading = () => {
    if (!sanitized.trim() || !SPEECH_SUPPORTED) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(sanitized);
    speech.lang = "en-US";
    speech.rate = 1;
    speech.pitch = 1;
    const finish = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    speech.onend = finish;
    speech.onerror = finish;
    setIsSpeaking(true);
    setIsPaused(false);
    window.speechSynthesis.speak(speech);
  };

  const pauseReading = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeReading = () => {
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const highlightSanitized = (text) => {
    // URLs are shown as typed: never mark the underscores/digits inside a link.
    return text
      .split(/(\bhttps?:\/\/[^\s]+)/gi)
      .map((part, i) => (i % 2 === 1 ? escapeHtml(part) : highlightPlain(part)))
      .join("");
  };

  const highlightPlain = (text) => {
    let highlightedText = escapeHtml(text);

    grammarSuggestions.forEach((item) => {
      if (item.type === "spelling" && item.incorrect) {
        const regex = new RegExp(`\\b(${item.incorrect})\\b`, "gi");
        highlightedText = highlightedText.replace(regex, `<span class="spell-error">$1</span>`);
      }
    });

    highlightedText = highlightedText.replace(
      /\b\d(-\d)+\b/g,
      `<span class="phone-highlight">$&</span>`
    );

    highlightedText = highlightedText.replace(
      /(\b\w_\w+\b)/g,
      `<span class="highlight">$1</span>`
    );

    highlightedText = highlightedText.replace(
      /\b((?:m|M)(?:a|A)-(?:i|I)(?:l|L)|(?:e|E)(?:m|M)-(?:a|A)(?:i|I)(?:l|L))\b/g,
      `<span class="highlight">$1</span>`
    );

    return highlightedText;
  };

  const handleSave = async () => {
    if (!hasRealText || !onSaveMessage) return false;
    try {
      await onSaveMessage({ originalText: input, sanitizedText: sanitized, client: selectedClient || null });
      setSaveSuccess(true);
      notify("Saved to tab");
      setTimeout(() => setSaveSuccess(false), 2000);
      return true;
    } catch {
      // parent surfaces the error
      return false;
    }
  };

  /* One click: copy the clean text and keep a record of it. */
  const handleCopyAndSave = async () => {
    if (!hasRealText) return;
    const ok = await copyText();
    if (ok) await handleSave();
  };

  /* Shortcuts: Ctrl/Cmd+Enter copies, Ctrl/Cmd+Shift+Enter copies and saves, Ctrl/Cmd+S saves. */
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      // Don't copy/save behind an open dialog (account, confirm, palette...).
      if (document.querySelector(".confirm-backdrop, .palette-backdrop, .view-message-backdrop, .modal-backdrop")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) handleCopyAndSave();
        else copyText();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="editor-card">
      <div className="editor-row">
        {/* INPUT COLUMN */}
        <div className="editor-column">
          <div className="input-header">
            <label htmlFor="editor-input">Input Text</label>
            <div className="input-tools">
              <button type="button" className="tool-btn" onClick={pasteFromClipboard} title="Paste from clipboard">
                <IconPaste size={15} /> <span>Paste</span>
              </button>
              <div className="tpl-wrap">
                <button
                  type="button"
                  className={`tool-btn ${pickerOpen ? "active" : ""}`}
                  onClick={() => setPickerOpen((v) => !v)}
                  aria-haspopup="dialog"
                  aria-expanded={pickerOpen}
                  title="Insert a template"
                >
                  <IconTemplate size={15} /> <span>Templates</span>
                </button>
                {pickerOpen && (
                  <TemplatePicker
                    templates={templates}
                    client={selectedClientObj}
                    onInsert={handlePickTemplate}
                    onClose={closePicker}
                    onManage={() => {
                      setPickerOpen(false);
                      onManageTemplates?.();
                    }}
                  />
                )}
              </div>
              {input && (
                <button type="button" className="clear-btn" onClick={clearText}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {previousText && (
            <div className="undo-banner">
              <span>{loadedText?.label || "Template loaded."}</span>
              <button
                type="button"
                onClick={() => {
                  setInput(previousText);
                  setDebouncedInput(previousText);
                  setPreviousText(null);
                }}
              >
                Restore my previous text
              </button>
            </div>
          )}

          <textarea
            id="editor-input"
            ref={textareaRef}
            placeholder="Type your Fiverr message here..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsTranslated(false);
              setTranslatedText("");
              translateReq.current += 1;
              setTranslating(false);
            }}
          />

          <div className={`counter ${isLimitExceeded ? "counter-error" : ""}`}>
            <span>Words: {wordCount} | Characters: {charCount}</span>
            <span className="counter-limit">{charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}</span>
          </div>
          <div
            className={`limit-meter limit-${limitTone}`}
            role="progressbar"
            aria-label="Character limit used"
            aria-valuemin={0}
            aria-valuemax={CHAR_LIMIT}
            aria-valuenow={Math.min(charCount, CHAR_LIMIT)}
          >
            <span style={{ width: `${limitPct}%` }} />
          </div>
          {isLimitExceeded && (
            <p className="limit-note">Over the {CHAR_LIMIT.toLocaleString()}-character limit by {(charCount - CHAR_LIMIT).toLocaleString()}. Shorten it before sending.</p>
          )}

        </div>

        {/* PREVIEW COLUMN */}
        <div className="editor-column">
          <div className="preview-header">
            <label>Sanitized Preview</label>
            <div className="preview-actions">
              <button className="translate-btn" disabled={!hasRealText || translating} onClick={translateToBengali}>
                {translating ? "Translating…" : isTranslated ? "Show English" : "Translate"}
              </button>

              {SPEECH_SUPPORTED && (
              <button
                className={`read-btn ${isSpeaking ? "speaking" : ""}`}
                disabled={!hasRealText}
                onClick={() => {
                  if (!isSpeaking) startReading();
                  else if (isPaused) resumeReading();
                  else pauseReading();
                }}
              >
                {!isSpeaking && "Read"}
                {isSpeaking && !isPaused && "Pause"}
                {isSpeaking && isPaused && "Resume"}
              </button>
              )}

              {SPEECH_SUPPORTED && isSpeaking && (
                <button className="stop-btn" onClick={stopReading}>
                  Stop
                </button>
              )}

              <button className={`copy-btn ${copied ? "copied" : ""}`} disabled={!hasRealText} onClick={copyText}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div
            className="preview-box"
            dangerouslySetInnerHTML={{
              __html: isTranslated
                ? escapeHtml(translatedText)
                : hasRealText
                ? highlightSanitized(sanitized)
                : "Nothing to preview yet..."
            }}
          />

          {clients.length > 0 && (
            <label className="save-client-pick">
              <span>Link to client (optional)</span>
              <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}{c.project ? ` - ${c.project}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="save-actions">
            <button
              type="button"
              className={`save-tab-btn ${saveSuccess ? "saved" : ""}`}
              disabled={!hasRealText || saving}
              onClick={handleSave}
            >
              <IconSave size={16} />
              {saving ? "Saving..." : saveSuccess ? "Saved to tab ✓" : "Save to Tab"}
            </button>
            <button
              type="button"
              className="copy-save-btn"
              disabled={!hasRealText || saving}
              onClick={handleCopyAndSave}
              title={`Copy and save (${MOD}+Shift+Enter)`}
            >
              Copy &amp; Save
            </button>
          </div>
        </div>
      </div>

      {(hasWarnings || stats || grammarSuggestions.length > 0) && (
        <div className="review-grid">
          {(hasWarnings || stats) && (
            <div className="review-col">
            {hasWarnings && (
              <div className="warning-box">
                <h3>Compliance Warnings</h3>
                <div className="warning-list">
                  {emailRemoved && (
                    <div className="warning-item">
                      <span className="warning-icon">⚠️</span>
                      <span>Email address was removed for compliance reasons.</span>
                    </div>
                  )}
                  {reservedWarnings.map((item, index) => (
                    <div key={index} className="warning-item">
                      <span className="warning-icon">⚠️</span>
                      <span>{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          {stats && (
            <div className="quality-box">
              <div className="quality-head">
                <h3>Message Quality</h3>
                <div className="quality-stats">
                  <span>{formatReadTime(stats.readSeconds)}</span>
                  <span>{stats.sentences} sentence{stats.sentences === 1 ? "" : "s"}</span>
                  <span>~{stats.avgSentence} words each</span>
                </div>
              </div>
              <ul className="quality-checks">
                {toneChecks.map((c) => (
                  <li key={c.id} className={c.ok ? "ok" : "todo"}>
                    <span aria-hidden="true">{c.ok ? "✓" : "○"}</span> {c.label}
                  </li>
                ))}
                {stats.longSentences > 0 && (
                  <li className="todo">
                    <span aria-hidden="true">○</span> {stats.longSentences} very long sentence{stats.longSentences === 1 ? "" : "s"} - consider splitting
                  </li>
                )}
              </ul>
              <p className="quality-hint">Tip: {MOD}+Enter copies · {MOD}+S saves · {MOD}+Shift+Enter does both.</p>
            </div>
          )}
            </div>
          )}

          {grammarSuggestions.length > 0 && (
            <div className="grammar-box">
              <h3>
                Grammar Suggestions <span className="count-pill">{grammarSuggestions.length}</span>
              </h3>
              {grammarSuggestions.map((item, index) => (
                <div key={index} className="grammar-item">
                  <span>{item.message}</span>
                  <button
                    className="apply-btn"
                    onClick={() =>
                      item.dismissOnly
                        ? setGrammarSuggestions((list) => list.filter((x) => x !== item))
                        : applyGrammarFix(item.fixedText)
                    }
                  >
                    {item.dismissOnly ? "Dismiss" : "Apply"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
