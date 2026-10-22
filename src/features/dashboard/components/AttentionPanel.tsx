import { useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '../../../shared/ui/icons';
import { actOnAttention, actionableItems, type AttentionVerb } from '../model/attentionActions';
import type { AttentionItem } from '../model/attentionFeed';

const TONE_LABEL = { danger: 'Critical', warning: 'Warning', info: 'Info', success: 'Good' } as const;
const VISIBLE = 6;

interface AttentionPanelProps {
  items: AttentionItem[];
  /** The line under the title (which modules the list spans). */
  subtitle: ReactNode;
  /** Shown instead of the plain "nothing" line when the list is empty; the page uses it to offer resetting its filters. */
  empty?: ReactNode;
  /** Runs the change; defaults to the alert stores (tests pass their own). */
  onAct?: (items: AttentionItem[], verb: AttentionVerb) => void;
}

/**
 * The dashboard's "Needs attention" panel. A row that is one alert has Resolve and Ignore beside it, so triage is
 * one click here instead of a trip to the alert list; every action offers Undo in a toast. The row itself still
 * links to where the alert is handled in full. Every row shares the same columns (dot, text, actions, chevron), so
 * the actions and the chevron line up down the list whether or not a row has actions. The header carries "Resolve
 * all" (the alerts among the rows on show) beside "All alerts".
 */
export function AttentionPanel({ items, subtitle, empty, onAct = actOnAttention }: AttentionPanelProps) {
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  // The row that was acted on leaves the list, taking keyboard focus with it: park focus on the list itself.
  const act = (acted: AttentionItem[], verb: AttentionVerb) => {
    onAct(acted, verb);
    listRef.current?.focus();
  };
  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hidden = items.length - shown.length;
  const actionable = actionableItems(shown);

  return (
    <section className="mv-panel mv-attention" aria-labelledby={titleId}>
      <div className="mv-panel-header mv-attention-header">
        <div>
          <h2 id={titleId} className="mv-panel-title">Needs attention</h2>
          <p className="mv-muted">{subtitle}</p>
        </div>
        <div className="mv-attention-header-actions">
          {actionable.length > 1 && (
            <button type="button" className="mv-quiet-button" onClick={() => act(actionable, 'resolve')}>Resolve all {actionable.length} alerts</button>
          )}
          <Link className="mv-quiet-button" to="/alerts">All alerts</Link>
        </div>
      </div>
      {items.length === 0 ? (
        empty ?? <p className="mv-muted">Nothing needs attention right now.</p>
      ) : (
        <>
          <ul ref={listRef} tabIndex={-1} className={`mv-attention-list${shown.some((item) => item.alert) ? ' has-actions' : ''}`} aria-label="Items that need attention">
            {shown.map((item) => (
              <li key={item.id} className="mv-attention-item">
                <span className={`mv-insight-dot mv-insight-dot--${item.tone}`} aria-hidden />
                <span className="mv-attention-text">
                  <Link className="mv-attention-link" to={item.to ?? '/alerts'}>
                    <span className="mv-sr-only">{TONE_LABEL[item.tone]}: </span>
                    {item.title}
                  </Link>
                  {item.detail && <span className="mv-muted">{item.detail}</span>}
                </span>
                <span className="mv-attention-actions">
                  {item.alert && (
                    <>
                      <button type="button" className="mv-quiet-button" aria-label={`Resolve: ${item.title}`} onClick={() => act([item], 'resolve')}>Resolve</button>
                      <button type="button" className="mv-quiet-button mv-attention-ignore" aria-label={`Ignore: ${item.title}`} onClick={() => act([item], 'ignore')}>Ignore</button>
                    </>
                  )}
                </span>
                <ChevronRightIcon size={14} className="mv-attention-chevron" aria-hidden />
              </li>
            ))}
          </ul>
          {items.length > VISIBLE && (
            <button type="button" className="mv-quiet-button mv-attention-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show fewer' : `Show ${hidden} more`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
