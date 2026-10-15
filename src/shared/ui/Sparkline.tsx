interface SparklineProps {
  values: number[];
  /** Describes the trend for assistive tech, e.g. "Spend, last 6 months". */
  label: string;
  width?: number;
  height?: number;
}

/**
 * A tiny line for a KPI: no axes, one stroke, the last point marked. It carries direction only; the
 * exact figures live in the KPI beside it, so the SVG is labelled rather than described point by point.
 */
export function Sparkline({ values, label, width = 96, height = 28 }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return (
    <svg className="mv-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(values[last])} r={3} fill="currentColor" stroke="var(--mv-surface)" strokeWidth={2} />
    </svg>
  );
}
