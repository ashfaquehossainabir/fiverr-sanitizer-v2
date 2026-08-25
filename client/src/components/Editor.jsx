import { useEffect, useState } from "react";
import { sanitizeText } from "../lib/sanitizer.js";
import { getGrammarSuggestions } from "../lib/grammarSuggestions.js";
import { getReservedWarnings } from "../lib/utility/reservedWarnings.js";

const URL_REGEX = /\bhttps?:\/\/[^\s]+/gi;
const CHAR_LIMIT = 2500;

export default function Editor({ onSaveMessage, saving }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [input, setInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");

  const [translatedText, setTranslatedText] = useState("");
  const [isTranslated, setIsTranslated] = useState(false);

  const [grammarSuggestions, setGrammarSuggestions] = useState([]);
  const [reservedWarnings, setReservedWarnings] = useState([]);

  const [copied, setCopied] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* -------------------- DEBOUNCE -------------------- */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 400);
    return () => clearTimeout(timer);
  }, [input]);

  const normalizedInput = debouncedInput.trimStart();
  const hasRealText = normalizedInput.trim().length > 0;

  const { text: sanitized, emailRemoved } = hasRealText
    ? sanitizeText(normalizedInput)
    : { text: "", emailRemoved: false };

  const hasRealCharacter = /[a-zA-Z0-9]/.test(input);
  const charCount = hasRealCharacter ? input.length : 0;
  const wordCount = hasRealCharacter
    ? input.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const isLimitExceeded = charCount > CHAR_LIMIT;

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
    setReservedWarnings(getReservedWarnings(textWithoutUrls));
  }, [debouncedInput]);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
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
    if (!hasRealText) return;
    await navigator.clipboard.writeText(sanitized);
    setCopied(true);
    setCopySuccess(true);
    setTimeout(() => {
      setCopied(false);
      setCopySuccess(false);
    }, 2000);
  };

  const translateToBengali = async () => {
    if (!sanitized.trim()) return;
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(
          sanitized
        )}`
      );
      const data = await res.json();
      const translated = data[0].map((item) => item[0]).join("");
      setTranslatedText(translated);
      setIsTranslated(true);
    } catch {
      alert("Translation failed. Please try again.");
    }
  };

  const startReading = () => {
    if (!sanitized.trim()) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(sanitized);
    speech.lang = "en-US";
    speech.rate = 1;
    speech.pitch = 1;
    speech.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
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
    let highlightedText = text;

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

    return highlightedText;
  };

  const handleSave = async () => {
    if (!hasRealText || !onSaveMessage) return;
    try {
      await onSaveMessage({ originalText: input, sanitizedText: sanitized });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // parent surfaces the error
    }
  };

  return (
    <div className="editor-card">
      <div className="editor-row">
        {/* INPUT COLUMN */}
        <div className="editor-column">
          <div className="input-header">
            <label>Input Text</label>
            {input && (
              <button type="button" className="clear-btn" onClick={clearText}>
                Clear
              </button>
            )}
          </div>

          <textarea
            placeholder="Type your Fiverr message here..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsTranslated(false);
              setTranslatedText("");
            }}
          />

          <div className={`counter ${isLimitExceeded ? "counter-error" : ""}`}>
            Words: {wordCount} | Characters: {charCount}
          </div>

          {(reservedWarnings.length > 0 || emailRemoved) && (
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
        </div>

        {/* PREVIEW COLUMN */}
        <div className="editor-column">
          <div className="preview-header">
            <label>Sanitized Preview</label>
            <div className="preview-actions">
              <button className="translate-btn" disabled={!hasRealText} onClick={translateToBengali}>
                Translate
              </button>

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

              {isSpeaking && (
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
                ? translatedText
                : hasRealText
                ? highlightSanitized(sanitized)
                : "Nothing to preview yet..."
            }}
          />

          <button
            type="button"
            className={`save-tab-btn ${saveSuccess ? "saved" : ""}`}
            disabled={!hasRealText || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : saveSuccess ? "Saved to tab ✓" : "Save to Tab"}
          </button>
        </div>
      </div>

      {grammarSuggestions.length > 0 && (
        <div className="grammar-box">
          <h3>Grammar Suggestions</h3>
          {grammarSuggestions.map((item, index) => (
            <div key={index} className="grammar-item">
              <span>{item.message}</span>
              <button className="apply-btn" onClick={() => applyGrammarFix(item.fixedText)}>
                Apply
              </button>
            </div>
          ))}
        </div>
      )}

      {copySuccess && <div className="copy-toast">✔ Text copied to clipboard</div>}
    </div>
  );
}
