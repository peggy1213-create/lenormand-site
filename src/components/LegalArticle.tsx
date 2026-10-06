import ReactMarkdown from "react-markdown";
import OrnamentRule from "@/components/ds/OrnamentRule";
import type { LegalDoc } from "@/content/legal/types";
import styles from "./LegalArticle.module.css";

/**
 * Renders a legal document (Terms of Service, Privacy Policy) as a styled
 * article: a centered title + ornament header, then the Markdown body inside
 * the same card treatment used by the About and Learn pages.
 */
export default function LegalArticle({ doc }: { doc: LegalDoc }) {
  return (
    <main className={styles.main}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 40,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-900)",
            margin: 0,
          }}
        >
          {doc.title}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--text-subtle)",
            margin: "12px 0 0",
          }}
        >
          {doc.updated}
        </p>
        <OrnamentRule style={{ margin: "20px 0 0" }} />
      </div>

      <div className={styles.card}>
        <ReactMarkdown
          components={{
            h2: ({ ...props }) => <h2 className={styles.h2} {...props} />,
            h3: ({ ...props }) => <h3 className={styles.h3} {...props} />,
            p: ({ ...props }) => <p className={styles.p} {...props} />,
            strong: ({ ...props }) => <strong className={styles.strong} {...props} />,
            ul: ({ ...props }) => <ul className={styles.ul} {...props} />,
            ol: ({ ...props }) => <ol className={styles.ol} {...props} />,
            li: ({ ...props }) => <li className={styles.li} {...props} />,
            hr: () => <hr className={styles.hr} />,
            a: ({ href, children, ...props }) => {
              const external = !!href && /^https?:\/\//.test(href);
              return (
                <a
                  href={href}
                  className={styles.a}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  {...props}
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {doc.body}
        </ReactMarkdown>
      </div>
    </main>
  );
}
