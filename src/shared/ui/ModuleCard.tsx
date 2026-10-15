import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { LockIcon } from './icons';

export interface ModuleCardMetric {
  label: string;
  value: string;
}

/** One cell of the segmented meter. Status segments carry meaning; `fill`
 * and `empty` show a plain proportion. */
export type MeterSegment = 'ok' | 'warn' | 'crit' | 'fill' | 'empty';

export interface ModuleCardMeter {
  segments: MeterSegment[];
  /** Says in words what the meter shows — the colours are never the only cue. */
  caption: string;
}

export interface ModuleCardProps {
  title: string;
  icon: ComponentType<{ size?: number }>;
  subscribed: boolean;
  metrics?: ModuleCardMetric[];
  meter?: ModuleCardMeter;
  features?: string[];
  actionLabel: string;
  actionPath: string;
}

/**
 * MAVERA_DESIGN_SYSTEM.md §8.6 ModuleCard, drawn as a readout tile in the
 * dashboard's operations pulse deck. Every module gets equal prominence and
 * the same colours; only status segments use red, amber or green.
 */
export function ModuleCard({ title, icon: Icon, subscribed, metrics = [], meter, features = [], actionLabel, actionPath }: ModuleCardProps) {
  return (
    <article className="mv-module-card">
      <div className="mv-module-card-header">
        <h3><Icon size={16} />{title}</h3>
        {!subscribed && (
          <span className="mv-status mv-status--neutral">
            <LockIcon size={12} style={{ marginRight: '0.25rem', verticalAlign: -1 }} />
            Available to add
          </span>
        )}
      </div>
      {subscribed ? (
        <>
          <div className="mv-module-card-metrics">
            {metrics.map((metric) => (
              <div className="mv-module-card-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
          {meter && (
            <div className="mv-meter">
              <div className="mv-meter-track" aria-hidden>
                {meter.segments.map((segment, index) => (
                  <i key={index} className={`mv-meter-seg mv-meter-seg--${segment}`} />
                ))}
              </div>
              <p className="mv-meter-caption">{meter.caption}</p>
            </div>
          )}
        </>
      ) : (
        <ul className="mv-module-card-features">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      )}
      <Link className="mv-module-card-action" to={actionPath}>
        {actionLabel}
      </Link>
    </article>
  );
}
