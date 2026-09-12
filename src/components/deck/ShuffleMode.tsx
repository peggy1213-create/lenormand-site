"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CARD_BACK_IMAGE, type Card } from "@/data/cards";
import { shuffle } from "@/lib/shuffle";
import { useDrawnCards } from "./useDeckState";
import styles from "./DeckViewer.module.css";

type Phase = "idle" | "shuffling" | "revealed";

const STACK_LAYERS = 6;
const SHUFFLE_MS = 1000;
const FLIP_DELAY_MS = 120;

export default function ShuffleMode({ cards }: { cards: Card[] }) {
  const t = useTranslations("deckViewer");
  const cardsT = useTranslations("cards");
  const router = useRouter();
  const reduce = useReducedMotion();

  const { drawn: drawnIds, addDrawn, resetDrawn, hydrated } = useDrawnCards();

  const [drawn, setDrawn] = useState<Card | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [showFace, setShowFace] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const remaining = useMemo(
    () => cards.filter((c) => !drawnIds.has(c.id)),
    [cards, drawnIds],
  );
  const drawnCount = drawnIds.size;
  const allDrawn = hydrated && remaining.length === 0;

  const draw = useCallback(() => {
    if (phase === "shuffling" || allDrawn || !hydrated) return;
    setShowFace(false);
    setPhase("shuffling");

    const shuffleDuration = reduce ? 200 : SHUFFLE_MS;

    const t1 = window.setTimeout(() => {
      const pool = shuffle(remaining);
      const pick = pool[0];
      setDrawn(pick);
      addDrawn(pick.id);
      setPhase("revealed");
      const t2 = window.setTimeout(() => setShowFace(true), FLIP_DELAY_MS);
      timers.current.push(t2);
    }, shuffleDuration);
    timers.current.push(t1);
  }, [phase, allDrawn, hydrated, remaining, addDrawn, reduce]);

  const reshuffle = useCallback(() => {
    resetDrawn();
    setDrawn(null);
    setShowFace(false);
    setPhase("idle");
  }, [resetDrawn]);

  const handleDeckKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      draw();
    }
  };

  const goToDrawn = () => {
    if (drawn) router.push(`/deck/${drawn.id}`);
  };

  const handleDrawnKey = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === " ") {
      e.preventDefault();
      goToDrawn();
    }
  };

  const deckLabel = allDrawn
    ? t("deckEmptyAria")
    : phase === "shuffling"
      ? t("shufflingAria")
      : drawn
        ? t("drawAnotherAria")
        : t("deckAria");

  const stackStyle = { ["--card-back-url" as string]: `url('${CARD_BACK_IMAGE}')` } as React.CSSProperties;

  return (
    <div className={styles.stage}>
      <div className={styles.counters} aria-live="polite">
        <span>
          {t("drawnCounter", { count: drawnCount, total: cards.length })}
        </span>
      </div>

      {drawn && phase !== "shuffling" && (
        <>
          <div className={styles.drawnWrap}>
            <Link
              href={`/deck/${drawn.id}`}
              className={styles.drawnLink}
              data-face={showFace ? "front" : "back"}
              aria-label={t("drawnAria", { name: cardsT(`${drawn.slug}.name`) })}
              onKeyDown={handleDrawnKey}
              style={stackStyle}
            >
              <span className={styles.drawnBack} aria-hidden="true" />
              <span
                className={styles.drawnFace}
                style={{ backgroundImage: `url('${drawn.image}')` }}
                aria-hidden="true"
              />
            </Link>
          </div>
          {showFace && (
            <span className={styles.drawnCaption}>
              <span className={styles.drawnNumber}>
                {String(drawn.id).padStart(2, "0")}
              </span>
              {cardsT(`${drawn.slug}.name`)}
            </span>
          )}
        </>
      )}

      {(!drawn || phase === "shuffling") && (
        <button
          type="button"
          className={styles.deck}
          aria-label={deckLabel}
          aria-disabled={allDrawn || phase === "shuffling"}
          onClick={draw}
          onKeyDown={handleDeckKey}
          style={stackStyle}
        >
          {Array.from({ length: STACK_LAYERS }).map((_, i) => {
            const depth = i - (STACK_LAYERS - 1);
            const restX = depth * 0.6;
            const restY = depth * 0.6;
            const restRot = depth * 0.3;
            const shuffleX = reduce
              ? restX
              : restX + (i % 2 === 0 ? -14 : 14) * ((i + 1) / STACK_LAYERS);
            const shuffleY = reduce ? restY : restY + ((i % 3) - 1) * 6;
            const shuffleRot = reduce ? restRot : restRot + (i % 2 === 0 ? -8 : 8);

            return (
              <motion.span
                key={i}
                className={styles.deckCard}
                initial={false}
                animate={
                  phase === "shuffling"
                    ? {
                        x: [restX, shuffleX, restX],
                        y: [restY, shuffleY, restY],
                        rotate: [restRot, shuffleRot, restRot],
                      }
                    : { x: restX, y: restY, rotate: restRot }
                }
                transition={{
                  duration: reduce ? 0.2 : SHUFFLE_MS / 1000,
                  ease: "easeInOut",
                  times: phase === "shuffling" ? [0, 0.5, 1] : undefined,
                }}
              />
            );
          })}
        </button>
      )}

      <p className={styles.deckHint}>
        {allDrawn
          ? t("deckEmptyHint")
          : phase === "shuffling"
            ? t("shufflingHint")
            : drawn
              ? t("tapDrawnHint")
              : t("tapDeckHint")}
      </p>

      <div className={styles.actions}>
        {drawn && !allDrawn && (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={draw}
            disabled={phase === "shuffling"}
          >
            {t("drawAnother")}
          </button>
        )}
        <div className={styles.actionColumn}>
          <button
            type="button"
            className={`${styles.actionButton} ${drawn ? "" : styles.actionButtonPrimary}`}
            onClick={reshuffle}
            disabled={drawnCount === 0 || phase === "shuffling"}
            title={t("reshuffleHint")}
            aria-label={t("reshuffleHint")}
          >
            {t("reshuffle")}
          </button>
          {drawnCount > 0 && (
            <span className={styles.actionsHint}>{t("reshuffleHint")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
