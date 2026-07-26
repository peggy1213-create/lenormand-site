export default function PlaceholderSlot({ label }: { label: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <div className="h-40 w-24 rounded-lg border-2 border-dashed border-muted/40 sm:h-48 sm:w-28" />
    </div>
  );
}
