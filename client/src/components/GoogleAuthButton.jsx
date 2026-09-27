import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptLoadPromise = null;

function loadGoogleScript() {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services.")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services."));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Renders Google's own "Sign in with Google" button (via Google Identity
 * Services) and hands the resulting ID token credential up to the caller.
 * Renders nothing if VITE_GOOGLE_CLIENT_ID isn't configured, so the rest of
 * the auth page still works fine without it set up.
 */
export default function GoogleAuthButton({ text = "continue_with", onCredential, onError, disabled = false }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
          }
        });
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) onError?.(err);
      });

    return () => {
      cancelled = true;
    };
    // onCredential/onError are expected to be stable-ish; re-initializing on
    // every render would tear down and re-render the Google button needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.google?.accounts?.id) return;

    let lastWidth = 0;

    const renderButton = () => {
      const node = containerRef.current;
      if (!node) return;

      const width = Math.min(node.offsetWidth || 360, 400);

      // Skip re-rendering if the width barely moved — re-rendering always
      // replaces the iframe, which itself can nudge the container's size
      // and re-trigger the observer. Without this guard that becomes an
      // infinite render loop (visible as a flickering cursor over the
      // button as it's constantly torn down and rebuilt).
      if (Math.abs(width - lastWidth) < 2) return;
      lastWidth = width;

      node.innerHTML = "";
      window.google.accounts.id.renderButton(node, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text,
        logo_alignment: "left",
        width
      });
    };

    renderButton();

    const resizeObserver = new ResizeObserver(() => renderButton());
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [ready, text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      className={`google-auth-button${disabled ? " is-disabled" : ""}`}
      ref={containerRef}
      aria-label="Continue with Google"
    />
  );
}
