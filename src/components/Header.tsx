"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import styles from "./Header.module.css";

export default function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navItems = [
    { href: "/draw", label: t("home") },
    { href: "/history", label: t("history") },
    { href: "/about", label: t("about") },
  ];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 32,
        padding: "22px 48px",
        borderBottom: "1px solid var(--border-hair)",
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "baseline", gap: 14, textDecoration: "none" }}>
        <span className={styles.wordmark}>Lenormand</span>
        <span className={styles.script}>oracle</span>
      </Link>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return active ? (
            <span key={item.href} className={styles.navActive}>
              {item.label}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
