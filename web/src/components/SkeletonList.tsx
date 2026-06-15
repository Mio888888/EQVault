export default function SkeletonList() {
  return (
    <div className="border border-line rounded-card overflow-hidden bg-surface shadow-card">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-2.5 border-b border-line/60 animate-pulse"
        >
          <div className="w-3.5 h-3.5 shrink-0" />
          <div className="flex-1 h-4 bg-line rounded" />
          <div className="w-12 h-4 bg-line rounded shrink-0" />
          <div className="w-10 h-4 bg-line rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}
