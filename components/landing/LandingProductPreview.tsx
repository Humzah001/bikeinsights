/**
 * Illustrative dashboard mockup (not a live screenshot). Builds product recognition on the landing page.
 */
export function LandingProductPreview() {
  const bars = [40, 65, 45, 80, 55, 90, 70];
  return (
    <div className="relative w-full">
      <div
        className="rounded-xl border border-border/80 bg-card/95 shadow-2xl ring-1 ring-foreground/10 overflow-hidden backdrop-blur-sm"
        aria-hidden
      >
        <div className="flex h-9 items-center gap-2 border-b border-border/60 bg-muted/40 px-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/90" />
            <span className="size-2.5 rounded-full bg-amber-400/90" />
            <span className="size-2.5 rounded-full bg-emerald-400/90" />
          </div>
          <div className="ml-2 min-w-0 flex-1 truncate rounded-md bg-background/70 px-2 py-1 text-[10px] text-muted-foreground">
            mybikeinsights.com/dashboard
          </div>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-3 sm:gap-3 sm:p-5">
          {[
            { label: "Collected (month)", value: "€4.3k" },
            { label: "Active rentals", value: "14" },
            { label: "Pending rent", value: "3" },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-border/50 bg-background/60 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{k.value}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3 sm:px-5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Profit trend</p>
          <div className="mt-2 flex h-16 items-end gap-1.5">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-chart-2/80 dark:bg-chart-2/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Illustrative preview. Your real dashboard uses live shop data.</p>
    </div>
  );
}
