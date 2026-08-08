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
    { href: "/spreads", label: t("home") },
    { href: "/history", label: t("history") },
    { href: "/about", label: t("about") },
  ];

  return (
    <header>
      <div className={styles.bar}>
        <Link href="/" className={styles.logo}>
          <svg
            className={styles.wordmark}
            xmlns="http://www.w3.org/2000/svg"
            width={316}
            height={80}
            viewBox="0 0 316 80"
            role="img"
            aria-label="In-Betweens"
            style={{ display: "block", height: 52, width: "auto", overflow: "visible" }}
          >
            <defs>
              <linearGradient id="ltRule" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="var(--gold-400)" stopOpacity={0} />
                <stop offset="0.5" stopColor="var(--gold-400)" stopOpacity={1} />
                <stop offset="1" stopColor="var(--gold-400)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <g transform="translate(0 2) scale(0.63333)">
              <g fill="var(--moss-500)">
                <path d="M60 8 C74 26, 74 42, 60 58 C46 42, 46 26, 60 8 Z" />
                <path d="M112 60 C94 74, 78 74, 62 60 C78 46, 94 46, 112 60 Z" />
                <path d="M60 112 C46 94, 46 78, 60 62 C74 78, 74 94, 60 112 Z" />
                <path d="M8 60 C26 46, 42 46, 58 60 C42 74, 26 74, 8 60 Z" />
              </g>
              <circle cx="60" cy="60" r="9" fill="var(--gold-400)" />
            </g>
            <text
              x="88"
              y="33"
              letterSpacing="0.6"
              fontWeight={300}
              fontSize={34}
              fill="var(--text-strong)"
              style={{ fontFamily: "Sentient, Cinzel, serif" }}
            >
              In-Betweens
            </text>
            <rect x="78" y="42" width="228" height="1" fill="url(#ltRule)" />
            <text
              x="192"
              y="65"
              textAnchor="middle"
              fontSize={14}
              letterSpacing="3.3"
              fill="var(--gold-500)"
              style={{ fontFamily: "'Cormorant SC', Cormorant Garamond, serif" }}
            >
              One Question at a Time
            </text>
          </svg>
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
