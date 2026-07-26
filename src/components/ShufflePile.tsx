"use client";

import { useRef, useState } from "react";
import { motion, type Transition } from "framer-motion";
import { CARD_BACK_IMAGE } from "@/data/cards";

// See specs/shuffle-interaction.md: click plays one of four physical
// gestures on all 36 individual cards; drag scatters/gathers them live.
// Both re-randomize the real deck order; only the click gesture counts
// toward the "shuffled N times" tally (drag does not).

type Gesture = "cut" | "riffle" | "overhand" | "tableSpread";
const GESTURES: Gesture[] = ["cut", "riffle", "overhand", "tableSpread"];
const CARD_COUNT = 36;
const DRAG_THRESHOLD_PX = 6;
const MAX_DRAG_PX = 110;

type Visual =
  | { kind: "rest" }
  | { kind: "drag"; amount: number }
  | { kind: "gesture"; type: Gesture; token: number };

// Deterministic per-index jitter so the resting pile reads as fanned /
// slightly messy rather than a perfect stack.
function baseOffset(index: number) {
  const angle = (((index * 47) % 17) - 8) * 0.6;
  const dx = (((index * 31) % 13) - 6) * 0.6;
  const dy = (((index * 19) % 9) - 4) * 0.6;
  return { angle, dx, dy };
}

function dragOffset(index: number, amount: number) {
  const base = baseOffset(index);
  const angleRad = (index / CARD_COUNT) * Math.PI * 2;
  const radius = amount * 90;
  return {
    x: base.dx + Math.cos(angleRad) * radius,
    y: base.dy + Math.sin(angleRad) * radius * 0.5,
    rotate: base.angle + amount * ((index % 7) - 3) * 8,
  };
}

type GestureFrame = {
  x: number[];
  y: number[];
  rotate: number[];
  transition: Transition;
};

function gestureFrame(type: Gesture, index: number): GestureFrame {
  const base = baseOffset(index);

  if (type === "cut") {
    const top = index >= CARD_COUNT / 2;
    return {
      x: top ? [base.dx, base.dx + 55, base.dx] : [base.dx, base.dx - 6, base.dx],
      y: top ? [base.dy, base.dy - 40, base.dy] : [base.dy, base.dy + 4, base.dy],
      rotate: top
        ? [base.angle, base.angle + 7, base.angle]
        : [base.angle, base.angle, base.angle],
      transition: { duration: 0.35, ease: "easeInOut" },
    };
  }

  if (type === "riffle") {
    const left = index % 2 === 0;
    return {
      x: left ? [base.dx, base.dx - 26, base.dx] : [base.dx, base.dx + 26, base.dx],
      y: [base.dy, base.dy - ((index % 5) + 2), base.dy],
      rotate: left
        ? [base.angle, base.angle - 5, base.angle]
        : [base.angle, base.angle + 5, base.angle],
      transition: { duration: 0.3, delay: index * 0.006, ease: "easeInOut" },
    };
  }

  if (type === "overhand") {
    const packet = Math.floor(index / (CARD_COUNT / 4));
    return {
      x: [base.dx, base.dx + (packet - 1.5) * 16, base.dx],
      y: [base.dy, base.dy - 32, base.dy + 10, base.dy],
      rotate: [base.angle, base.angle + (packet - 1.5) * 3, base.angle],
      transition: {
        duration: 0.4,
        delay: packet * 0.05,
        times: [0, 0.45, 0.8, 1],
        ease: "easeInOut",
      },
    };
  }

  // tableSpread
  const centered = index - (CARD_COUNT - 1) / 2;
  return {
    x: [base.dx, base.dx + centered * 4.5, base.dx],
    y: [base.dy, base.dy - 12, base.dy],
    rotate: [base.angle, centered * 2.6, base.angle],
    transition: { duration: 0.4, delay: Math.abs(centered) * 0.004, ease: "easeInOut" },
  };
}

export default function ShufflePile({
  onGestureShuffle,
  onDragShuffle,
  label,
}: {
  onGestureShuffle: () => void;
  onDragShuffle: () => void;
  label: string;
}) {
  const [visual, setVisual] = useState<Visual>({ kind: "rest" });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);
  const tokenRef = useRef(0);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStart.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const dist = Math.hypot(
      e.clientX - dragStart.current.x,
      e.clientY - dragStart.current.y,
    );
    if (dist > DRAG_THRESHOLD_PX) {
      didDrag.current = true;
      setVisual({ kind: "drag", amount: Math.min(1, dist / MAX_DRAG_PX) });
    }
  }

  function handlePointerUp() {
    if (didDrag.current) {
      onDragShuffle();
      setVisual({ kind: "rest" });
    }
    dragStart.current = null;
    // Let the click handler (fires after pointerup) see didDrag first.
    requestAnimationFrame(() => {
      didDrag.current = false;
    });
  }

  function playGestureShuffle() {
    tokenRef.current += 1;
    const type = GESTURES[Math.floor(Math.random() * GESTURES.length)];
    setVisual({ kind: "gesture", type, token: tokenRef.current });
    onGestureShuffle();
  }

  function handleClick() {
    if (didDrag.current) return; // suppress the click synthesized after a real drag
    playGestureShuffle();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      playGestureShuffle();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="relative mx-auto h-40 w-24 cursor-pointer touch-none select-none sm:h-48 sm:w-28"
    >
      {Array.from({ length: CARD_COUNT }, (_, i) => {
        const base = baseOffset(i);
        const key = visual.kind === "gesture" ? `card-${i}-g${visual.token}` : `card-${i}`;

        let animate: { x: number | number[]; y: number | number[]; rotate: number | number[] };
        let transition: Transition = { duration: 0 };

        if (visual.kind === "rest") {
          animate = { x: base.dx, y: base.dy, rotate: base.angle };
        } else if (visual.kind === "drag") {
          const d = dragOffset(i, visual.amount);
          animate = { x: d.x, y: d.y, rotate: d.rotate };
        } else {
          const g = gestureFrame(visual.type, i);
          animate = { x: g.x, y: g.y, rotate: g.rotate };
          transition = g.transition;
        }

        return (
          <motion.div
            key={key}
            initial={{ x: base.dx, y: base.dy, rotate: base.angle }}
            animate={animate}
            transition={transition}
            style={{ zIndex: i }}
            className="pointer-events-none absolute inset-0 rounded-lg shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CARD_BACK_IMAGE}
              alt=""
              className="h-full w-full rounded-lg object-cover"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
