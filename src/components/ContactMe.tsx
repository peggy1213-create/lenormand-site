"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import btn from "./ds/Button.module.css";
import styles from "./ContactMe.module.css";

const TALLY_SRC =
  "https://tally.so/embed/68BpyY?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";
const TALLY_SCRIPT = "https://tally.so/widgets/embed.js";

// Fallback height (px): used until Tally's embed script sizes the iframe to its
// content (dynamicHeight=1). Comfortably fits the whole form if that is blocked.
const FALLBACK_HEIGHT = 480;

// "Contact me" footer button that opens the Tally form embedded in a modal —
// the form stays on this site, no navigation to tally.so.
export default function ContactMe() {
  const t = useTranslations("footer");
  const [open, setOpen] = useState(false);

  // Load Tally's embed script (once) and hydrate the iframe whenever the
  // modal opens.
  useEffect(() => {
    if (!open) return;

    const w = window as unknown as { Tally?: { loadEmbeds: () => void } };
    const hydrate = () => {
      if (w.Tally) {
        w.Tally.loadEmbeds();
        return;
      }
      document
        .querySelectorAll<HTMLIFrameElement>("iframe[data-tally-src]:not([src])")
        .forEach((iframe) => {
          iframe.src = iframe.dataset.tallySrc as string;
        });
    };

    if (document.querySelector(`script[src="${TALLY_SCRIPT}"]`)) {
      hydrate();
    } else {
      const script = document.createElement("script");
      script.src = TALLY_SCRIPT;
      script.onload = hydrate;
      script.onerror = hydrate;
      document.body.appendChild(script);
    }
  }, [open]);

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={styles.trigger}>
      <button
        type="button"
        className={[btn.base, btn.sm, btn.ghost, styles.iconButton].join(" ")}
        onClick={() => setOpen(true)}
        aria-label={t("contact")}
        title={t("contact")}
      >
        <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open && (
        <div
          className={styles.overlay}
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={t("contact")}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label={t("contactClose")}
            >
              {t("contactClose")}
            </button>
            <h2 className={styles.title}>{t("contact")}</h2>
            <hr className={styles.rule} />
            <iframe
              data-tally-src={TALLY_SRC}
              loading="lazy"
              width="100%"
              height={FALLBACK_HEIGHT}
              frameBorder={0}
              marginHeight={0}
              marginWidth={0}
              title={t("contact")}
              className={styles.frame}
            />
          </div>
        </div>
      )}
    </div>
  );
}
