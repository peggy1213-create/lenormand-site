export default function CardKeywordsPanel({
  positionLabel,
  name,
  keywords,
}: {
  positionLabel: string;
  name: string;
  keywords: string[];
}) {
  return (
    <div
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--gold-400)",
        borderRadius: 8,
        padding: "16px 20px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-smallcaps)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          fontSize: 11,
          color: "var(--gold-500)",
        }}
      >
        {positionLabel}
      </p>
      <h3
        style={{
          margin: "4px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 18,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-900)",
        }}
      >
        {name}
      </h3>
      <p style={{ marginTop: 8, marginBottom: 0, fontSize: 15, color: "var(--text-body)" }}>{keywords.join(", ")}</p>
    </div>
  );
}
