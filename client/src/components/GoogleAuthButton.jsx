import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";

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
    script.onerror = () => {
      script.remove(); // so a retry can add a fresh tag instead of waiting on a dead one
      reject(new Error("Failed to load Google Identity Services."));
    };
    document.head.appendChild(script);
  });

  // Forget a failed load so the next mount tries again instead of reusing the rejection.
  scriptLoadPromise.catch(() => {
    scriptLoadPromise = null;
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
  const { theme } = useTheme();
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
    if (!ready || !containerRef.current || !window.google?.accounts?.id) return undefined;

    const host = containerRef.current;
    let lastWidth = 0;
    let lastTheme = null;
    let token = 0; // invalidates in-flight renders when a newer one starts
    let cleanupPending = null;

    const renderButton = () => {
      // The host has a fixed height and its children are absolutely
      // positioned, so measuring it never depends on what's inside it.
      const width = Math.min(host.offsetWidth || 360, 400);

      // Skip no-op re-renders (tiny width jitter, same theme). Re-rendering
      // replaces the iframe, so without this guard it could loop.
      if (Math.abs(width - lastWidth) < 2 && theme === lastTheme) return;
      lastWidth = width;
      lastTheme = theme;

      cleanupPending?.();
      const myToken = ++token;

      // Build the new button off-screen (invisible, on top of the old one),
      // and only swap once its iframe has loaded. The old button stays in
      // place meanwhile, so the page never collapses, flashes empty, or
      // shifts while Google re-renders on a theme/resize change.
      const next = document.createElement("div");
      next.className = "google-auth-button-layer is-pending";
      host.appendChild(next);

      window.google.accounts.id.renderButton(next, {
        type: "standard",
        // Google renders the button inside an iframe we can't style with CSS,
        // so we pick the matching built-in variant for the current app theme.
        theme: theme === "dark" ? "filled_black" : "outline",
        size: "large",
        shape: "rectangular",
        text,
        logo_alignment: "left",
        width
      });

      let fallbackTimer = null;
      let observer = null;

      const swap = () => {
        if (myToken !== token) return;
        cleanupPending?.();

        // Drop any layer that is still mid fade-out from an earlier swap.
        host.querySelectorAll(".is-leaving").forEach((el) => el.remove());

        // Crossfade: the previous button fades out while the new one fades in
        // (the transitions live in CSS), then the old one is removed.
        const leaving = Array.from(host.children).filter((child) => child !== next);
        leaving.forEach((el) => el.classList.add("is-leaving"));
        setTimeout(() => leaving.forEach((el) => el.remove()), 320);

        next.classList.remove("is-pending");
        host.dataset.loaded = "true"; // hides the loading placeholder
      };

      const watchIframe = () => {
        const iframe = next.querySelector("iframe");
        if (!iframe) return false;
        iframe.addEventListener("load", () => setTimeout(swap, 30), { once: true });
        return true;
      };

      cleanupPending = () => {
        clearTimeout(fallbackTimer);
        observer?.disconnect();
        cleanupPending = null;
      };

      if (!watchIframe()) {
        observer = new MutationObserver(() => {
          if (watchIframe()) observer.disconnect();
        });
        observer.observe(next, { childList: true, subtree: true });
      }
      // Safety net in case the iframe load event never reaches us.
      fallbackTimer = setTimeout(swap, 700);
    };

    renderButton();

    const resizeObserver = new ResizeObserver(() => renderButton());
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      cleanupPending?.();
      token += 1;
    };
  }, [ready, text, theme]); // re-render the button whenever the theme switches

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      className={`google-auth-button${disabled ? " is-disabled" : ""}`}
      ref={containerRef}
      aria-label="Continue with Google"
    />
  );
}
