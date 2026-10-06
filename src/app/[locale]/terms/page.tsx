import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LegalArticle from "@/components/LegalArticle";
import type { Locale } from "@/i18n/routing";
import { TERMS as EN_TERMS } from "@/content/legal/terms.en";
import { TERMS as ZH_TW_TERMS } from "@/content/legal/terms.zh-TW";
import { buildAlternates } from "@/lib/seo";

function getDoc(locale: Locale) {
  return locale === "zh-TW" ? ZH_TW_TERMS : EN_TERMS;
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
    alternates: buildAlternates(locale, "/terms"),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalArticle doc={getDoc(locale as Locale)} />;
}
