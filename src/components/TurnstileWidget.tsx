"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// Cloudflare Turnstile gate for the free reading tier. Turnstile tokens are
// single-use, so this exposes an imperative `consume()` that hands back the
// current unused token and immediately resets the widget to mint the next one
// — the free reading and each follow-up each need their own fresh token.
//
// The site key is public and baked in at build time; the matching secret lives
// only on the server (see src/app/api/reading/free/route.ts).

export type TurnstileHandle = {
  // Resolves with a fresh, unused token, or null if Turnstile isn't available
  // (script blocked, no site key) or no token arrives before `timeoutMs`.
  consume: (timeoutMs?: number) => Promise<string | null>;
};

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile load failed")));
      if (window.turnstile) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile load failed"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// `available` reports whether the widget could actually mount (site key set +
// script loaded) so the caller can fall back to copy-prompt when it can't.
const TurnstileWidget = forwardRef<TurnstileHandle, { onAvailabilityChange?: (ok: boolean) => void }>(
  function TurnstileWidget({ onAvailabilityChange }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    // The current unused token, and any pending waiter awaiting the next one.
    const tokenRef = useRef<string | null>(null);
    const waiterRef = useRef<((token: string | null) => void) | null>(null);
    const [available, setAvailable] = useState(false);

    useEffect(() => {
      onAvailabilityChange?.(available);
    }, [available, onAvailabilityChange]);

    useEffect(() => {
      if (!SITE_KEY) return;
      let cancelled = false;

      function onToken(token: string) {
        tokenRef.current = token;
        if (waiterRef.current) {
          const resolve = waiterRef.current;
          waiterRef.current = null;
          tokenRef.current = null;
          resolve(token);
        }
      }

      loadScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            appearance: "interaction-only",
            callback: onToken,
            "error-callback": () => {},
            "expired-callback": () => {
              tokenRef.current = null;
            },
          });
          setAvailable(true);
        })
        .catch(() => setAvailable(false));

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // widget already gone
          }
        }
        widgetIdRef.current = null;
      };
    }, []);

    useImperativeHandle(
      ref,
      (): TurnstileHandle => ({
        consume(timeoutMs = 15000) {
          if (!SITE_KEY || !available) return Promise.resolve(null);
          // A token is already sitting ready — hand it over and reset for next.
          if (tokenRef.current) {
            const token = tokenRef.current;
            tokenRef.current = null;
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {
                // ignore
              }
            }
            return Promise.resolve(token);
          }
          // Otherwise wait for the next callback (or time out).
          return new Promise<string | null>((resolve) => {
            const timer = setTimeout(() => {
              if (waiterRef.current) waiterRef.current = null;
              resolve(null);
            }, timeoutMs);
            waiterRef.current = (token) => {
              clearTimeout(timer);
              resolve(token);
            };
            // Nudge the widget in case it needs a (re)run to produce a token.
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {
                // ignore
              }
            }
          });
        },
      }),
      [available],
    );

    if (!SITE_KEY) return null;
    // interaction-only widgets stay invisible unless a challenge is needed, so
    // this container usually has zero height.
    return <div ref={containerRef} style={{ display: "flex", justifyContent: "center" }} />;
  },
);

export default TurnstileWidget;
