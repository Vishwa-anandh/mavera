import { Link } from 'react-router-dom';
import { ChevronRightIcon } from './icons';

export type InsightTone = 'danger' | 'warning' | 'info' | 'success';

export interface InsightItem {
  id: string;
  tone: InsightTone;
  title: string;
  detail?: string;
  /** App path the row opens; the whole row becomes a link. */
  to?: string;
}

const TONE_LABEL: Record<InsightTone, string> = { danger: 'Critical', warning: 'Warning', info: 'Info', success: 'Good' };

/**
 * Rows of "what needs attention": a tone dot (with a screen-reader label so colour is never the only
 * signal), a title, a one-line detail and, when the row links somewhere, a chevron.
 */
export function InsightList({ items, label, empty = 'Nothing needs attention.' }: { items: InsightItem[]; label: string; empty?: string }) {
  if (items.length === 0) return <p className="mv-muted">{empty}</p>;
  return (
    <ul className="mv-insight-list" aria-label={label}>
      {items.map((item) => {
        const body = (
          <>
            <span className={`mv-insight-dot mv-insight-dot--${item.tone}`} aria-hidden />
            <span className="mv-insight-text">
              <span className="mv-sr-only">{TONE_LABEL[item.tone]}: </span>
              <strong>{item.title}</strong>
              {item.detail && <span className="mv-muted">{item.detail}</span>}
            </span>
            {item.to && <ChevronRightIcon size={14} className="mv-insight-chevron" />}
          </>
        );
        return (
          <li key={item.id}>
            {item.to ? <Link className="mv-insight-row" to={item.to}>{body}</Link> : <div className="mv-insight-row">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}
