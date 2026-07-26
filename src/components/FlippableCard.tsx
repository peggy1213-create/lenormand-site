"use client";

import { motion } from "framer-motion";
import { CARD_BACK_IMAGE } from "@/data/cards";

export default function FlippableCard({
  frontSrc,
  frontAlt,
  revealed,
  onReveal,
  delaySeconds = 0,
  selected,
  onSelect,
}: {
  frontSrc: string;
  frontAlt: string;
  revealed: boolean;
  onReveal: () => void;
  delaySeconds?: number;
  selected?: boolean;
  onSelect?: () => void;
}) {
  function handleClick() {
    if (!revealed) {
      onReveal();
      return;
    }
    onSelect?.();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={revealed ? frontAlt : undefined}
      aria-pressed={revealed ? selected : undefined}
      className="shrink-0 [perspective:1000px]"
    >
      <motion.div
        className="relative h-40 w-24 sm:h-48 sm:w-28 [transform-style:preserve-3d]"
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.4, delay: delaySeconds }}
      >
        <div className="absolute inset-0 rounded-lg shadow-sm [backface-visibility:hidden]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CARD_BACK_IMAGE}
            alt=""
            className="h-full w-full rounded-lg object-cover"
          />
        </div>
        <div
          className={`absolute inset-0 rounded-lg shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] ${
            selected ? "ring-2 ring-gold" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frontSrc}
            alt=""
            className="h-full w-full rounded-lg object-cover"
          />
        </div>
      </motion.div>
    </button>
  );
}
