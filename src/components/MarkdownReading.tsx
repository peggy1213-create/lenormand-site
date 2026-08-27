import ReactMarkdown from "react-markdown";

// Renders an AI-generated reading's markdown (headings, bold, lists, rules)
// as proper typography instead of literal "**Overview**" syntax. Used both
// on the reading screen (dark scrim modal) and the History page (light
// cards), which need different text colors — hence `tone`.
export default function MarkdownReading({
  text,
  tone = "onDark",
}: {
  text: string;
  tone?: "onDark" | "onLight";
}) {
  const bodyColor = tone === "onDark" ? "var(--parchment-50)" : "var(--text-body)";
  const headingColor = tone === "onDark" ? "var(--gold-200)" : "var(--ink-900)";
  const mutedColor = tone === "onDark" ? "var(--gold-300)" : "var(--text-muted)";
  const ruleColor = tone === "onDark" ? "rgba(231,199,137,.28)" : "var(--border-hair)";

  return (
    <div style={{ fontSize: 16, lineHeight: 1.7, color: bodyColor }}>
      <ReactMarkdown
        components={{
          h1: ({ ...props }) => (
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 22,
                letterSpacing: "0.04em",
                color: headingColor,
                margin: "22px 0 10px",
              }}
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 19,
                letterSpacing: "0.03em",
                color: headingColor,
                margin: "20px 0 8px",
              }}
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              style={{
                fontFamily: "var(--font-smallcaps)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                fontSize: 13,
                color: mutedColor,
                margin: "18px 0 6px",
              }}
              {...props}
            />
          ),
          p: ({ ...props }) => <p style={{ margin: "0 0 12px" }} {...props} />,
          strong: ({ ...props }) => <strong style={{ color: headingColor, fontWeight: 600 }} {...props} />,
          em: ({ ...props }) => <em {...props} />,
          ul: ({ ...props }) => <ul style={{ margin: "0 0 12px", paddingLeft: 22 }} {...props} />,
          ol: ({ ...props }) => <ol style={{ margin: "0 0 12px", paddingLeft: 22 }} {...props} />,
          li: ({ ...props }) => <li style={{ marginBottom: 4 }} {...props} />,
          hr: () => <hr style={{ border: "none", borderTop: `1px solid ${ruleColor}`, margin: "20px 0" }} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
