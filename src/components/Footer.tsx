import { getTranslations } from "next-intl/server";
import Changelog from "@/components/Changelog";
import ContactMe from "@/components/ContactMe";
import styles from "./Footer.module.css";

export default async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-hair)",
        padding: "26px 48px 34px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "12px 32px",
        maxWidth: 1080,
        margin: "0 auto",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-smallcaps)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-caps)",
          fontSize: "var(--footer-caps-size)",
          color: "var(--gold-500)",
        }}
      >{`© ${year} In-Betweens by Peggy Hsieh`}</span>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "var(--footer-disclaimer-size)",
          color: "var(--text-subtle)",
        }}
      >
        {t("disclaimer")}
      </span>
      <div className={styles.bottomRow}>
        <Changelog />
        <ContactMe />
      </div>
    </footer>
  );
}
