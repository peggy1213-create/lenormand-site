"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import styles from "./Header.module.css";

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

export default function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { href: "/draw", label: t("home") },
    { href: "/history", label: t("history") },
    { href: "/about", label: t("about") },
  ];

  return (
    <header>
      <div className={styles.bar}>
        <Link href="/" className={styles.logo}>
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

        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-panel"
          aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav-panel" className={styles.mobilePanel}>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.mobileLink} ${active ? styles.mobileLinkActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
