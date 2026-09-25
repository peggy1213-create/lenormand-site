"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import styles from "./AuthButton.module.css";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function SignInModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("auth");

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t("close")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        <h2 className={styles.modalTitle}>{t("modalTitle")}</h2>
        <p className={styles.modalSubtitle}>{t("modalSubtitle")}</p>

        <button type="button" className={styles.googleBtn} onClick={handleGoogleSignIn}>
          <GoogleIcon />
          {t("signInWithGoogle")}
        </button>

        <p className={styles.terms}>
          {t("termsPrefix")}{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>
            {t("termsOfService")}
          </a>{" "}
          {t("termsAnd")}{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>
            {t("privacyPolicy")}
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AuthButton() {
  const t = useTranslations("auth");
  const { user, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sign-in is a dev-only feature — hidden entirely unless explicitly enabled
  // for the build (NEXT_PUBLIC_ENABLE_AUTH=true on dev). Keeps it off production.
  if (process.env.NEXT_PUBLIC_ENABLE_AUTH !== "true") return null;

  if (loading) return null;

  if (!user) {
    return (
      <>
        <button type="button" onClick={() => setShowModal(true)} className={styles.signIn}>
          {t("signIn")}
        </button>
        {showModal && <SignInModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const avatar = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name ?? user.email;

  return (
    <div className={styles.userMenu}>
      <button
        type="button"
        className={styles.avatarBtn}
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
      >
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className={styles.avatar}
            width={28}
            height={28}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className={styles.initial}>{name?.[0]?.toUpperCase()}</span>
        )}
      </button>
      {menuOpen && (
        <>
          <div className={styles.dropdownBackdrop} onClick={() => setMenuOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.dropdownName}>{name}</div>
            <button type="button" onClick={handleSignOut} className={styles.signOut}>
              {t("signOut")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
