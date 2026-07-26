export default function CardKeywordsPanel({
  positionLabel,
  name,
  keywords,
}: {
  positionLabel: string;
  name: string;
  keywords: string[];
}) {
  return (
    <div className="rounded-lg border border-gold/50 bg-white/50 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{positionLabel}</p>
      <h3 className="text-lg font-medium text-ink">{name}</h3>
      <p className="mt-2 text-sm text-ink">{keywords.join(", ")}</p>
    </div>
  );
}
