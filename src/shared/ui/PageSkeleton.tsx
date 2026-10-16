import { TableSkeleton } from './LoadStates';

export type PageSkeletonVariant = 'default' | 'dashboard' | 'table';

/** A shimmering placeholder bar; `className` sets its full size (height and width), so no two height classes clash. */
const Bar = ({ className }: { className: string }) => (
  <span
    className={`relative block overflow-hidden rounded-md bg-ink/8 after:absolute after:inset-0 after:-translate-x-full after:animate-skeleton after:bg-linear-to-r after:from-transparent after:via-ink/7 after:to-transparent motion-reduce:after:animate-none ${className}`}
  />
);

function Kpis({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid gap-2.5 py-1">
          <Bar className="h-3 w-[45%]" />
          <Bar className="h-7 w-[65%]" />
          <Bar className="h-2.5 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function ChartBlock() {
  return (
    <div className="grid content-start gap-3">
      <Bar className="h-4 w-2/5" />
      <Bar className="h-44 rounded-xl" />
    </div>
  );
}

function ListBlock({ rows }: { rows: number }) {
  return (
    <div className="grid content-start gap-3">
      <Bar className="h-4 w-2/5" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[0.5rem_1fr] items-center gap-3 py-2">
          <Bar className="size-2 rounded-full" />
          <div className="grid gap-1.5">
            <Bar className="h-3 w-[55%]" />
            <Bar className="h-2.5 w-[85%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

const TWO_COLUMNS = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-6';

/**
 * Stand-in for a whole page while its code or data loads: the page title, then the shapes a page is made
 * of (KPI strip, charts, lists, a table) so the layout doesn't jump when the real page arrives. One shared
 * shape per kind of page rather than one per route, so a new page gets a sensible loading state for free.
 */
export function PageSkeleton({ variant = 'default', label = 'Loading page' }: { variant?: PageSkeletonVariant; label?: string }) {
  return (
    <div className="grid gap-6" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <div className="grid gap-2.5" aria-hidden>
        <Bar className="h-7 w-[min(16rem,60%)]" />
        <Bar className="h-3.5 w-[min(28rem,85%)]" />
      </div>
      <div className="grid gap-6" aria-hidden>
        {variant === 'table' ? (
          <>
            <div className="flex flex-wrap gap-3">
              <Bar className="h-9 w-48 rounded-lg" />
              <Bar className="h-9 w-48 rounded-lg" />
            </div>
            <TableSkeleton columns={6} rows={7} label={label} />
          </>
        ) : variant === 'dashboard' ? (
          <>
            <Kpis count={5} />
            <div className={TWO_COLUMNS}><ListBlock rows={5} /><ChartBlock /></div>
            <div className={TWO_COLUMNS}><ListBlock rows={3} /><ChartBlock /></div>
          </>
        ) : (
          <>
            <Kpis count={4} />
            <div className={TWO_COLUMNS}><ChartBlock /><ChartBlock /></div>
            <div className={TWO_COLUMNS}><ListBlock rows={4} /><ListBlock rows={4} /></div>
          </>
        )}
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
