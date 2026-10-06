import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LegalArticle from "@/components/LegalArticle";
import type { Locale } from "@/i18n/routing";
import { PRIVACY as EN_PRIVACY } from "@/content/legal/privacy.en";
import { PRIVACY as ZH_TW_PRIVACY } from "@/content/legal/privacy.zh-TW";
import { buildAlternates } from "@/lib/seo";

function getDoc(locale: Locale) {
  return locale === "zh-TW" ? ZH_TW_PRIVACY : EN_PRIVACY;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const doc = getDoc(locale as Locale);
  return {
    title: doc.title,
    alternates: buildAlternates(locale, "/privacy"),
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalArticle doc={getDoc(locale as Locale)} />;
}
