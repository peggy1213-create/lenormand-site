import type { CSSProperties } from "react";

// Port of the design system's OrnamentRule.jsx — a gilded hairline rule
// with a small centred motif. Used as a section divider under headings.
export default function OrnamentRule({
  motif = "✦",
  tone = "gilt",
  style,
}: {
  motif?: string;
  tone?: "gilt" | "quiet";
  style?: CSSProperties;
}) {
  const color = tone === "gilt" ? "var(--gold-500)" : "var(--parchment-100)";
  const grad =
    tone === "gilt"
      ? "linear-gradient(90deg,transparent,var(--gold-400),transparent)"
      : "linear-gradient(90deg,transparent,var(--parchment-100),transparent)";

  return (
    <div role="separator" style={{ display: "flex", alignItems: "center", gap: 14, ...style }}>
      <span style={{ flex: 1, height: 1, background: grad }} />
      <span style={{ color, fontSize: 16, lineHeight: 1 }}>{motif}</span>
      <span style={{ flex: 1, height: 1, background: grad }} />
    </div>
  );
}
