import { TableSkeleton } from './LoadStates';

export type PageSkeletonVariant = 'default' | 'dashboard' | 'table';

const Bar = ({ className = '' }: { className?: string }) => <span className={`mv-skeleton ${className}`.trim()} />;

function Kpis({ count }: { count: number }) {
  return (
    <div className="mv-skel-kpis">
      {Array.from({ length: count }, (_, i) => <div key={i} className="mv-skel-kpi"><Bar /><Bar /><Bar /></div>)}
    </div>
  );
}

function ChartBlock() {
  return <div className="mv-skel-block"><Bar /><Bar className="mv-skel-chart" /></div>;
}

function ListBlock({ rows }: { rows: number }) {
  return (
    <div className="mv-skel-block">
      <Bar />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="mv-skel-row"><Bar className="mv-skel-dot" /><div className="mv-skel-lines"><Bar /><Bar /></div></div>
      ))}
    </div>
  );
}

/**
 * Stand-in for a whole page while its code or data loads: the page title, then the shapes a page is made
 * of (KPI strip, charts, lists, a table) so the layout doesn't jump when the real page arrives. One shared
 * shape per kind of page rather than one per route, so a new page gets a sensible loading state for free.
 */
export function PageSkeleton({ variant = 'default', label = 'Loading page' }: { variant?: PageSkeletonVariant; label?: string }) {
  return (
    <div className="mv-skel-page" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <div className="mv-skel-head" aria-hidden><Bar className="mv-skel-title" /><Bar className="mv-skel-sub" /></div>
      <div className="mv-skel-page" aria-hidden>
        {variant === 'table' ? (
          <>
            <div className="mv-skel-toolbar"><Bar /><Bar /></div>
            <TableSkeleton columns={6} rows={7} label={label} />
          </>
        ) : variant === 'dashboard' ? (
          <>
            <Kpis count={5} />
            <div className="mv-skel-cols"><ListBlock rows={5} /><ChartBlock /></div>
            <div className="mv-skel-cols"><ListBlock rows={3} /><ChartBlock /></div>
          </>
        ) : (
          <>
            <Kpis count={4} />
            <div className="mv-skel-cols"><ChartBlock /><ChartBlock /></div>
            <div className="mv-skel-cols"><ListBlock rows={4} /><ListBlock rows={4} /></div>
          </>
        )}
      </div>
      <span className="mv-sr-only">{label}…</span>
    </div>
  );
}
