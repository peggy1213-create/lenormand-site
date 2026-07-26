import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import SpreadBoard from "@/components/SpreadBoard";
import { SPREADS, type SpreadId } from "@/data/spreads";

export function generateStaticParams() {
  return SPREADS.map((spread) => ({ spread: spread.id }));
}

export default async function DrawPage({
  params,
}: {
  params: Promise<{ locale: string; spread: string }>;
}) {
  const { locale, spread } = await params;
  setRequestLocale(locale);

  const isValidSpread = SPREADS.some((s) => s.id === spread);
  if (!isValidSpread) notFound();

  return <SpreadBoard spreadId={spread as SpreadId} />;
}
