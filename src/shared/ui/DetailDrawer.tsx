import { useId, type ReactNode } from 'react';
import { CloseIcon } from './icons';
import { useModalOverlay } from './useOverlay';

interface DetailDrawerProps {
  title: string;
  /** One line under the title, e.g. the record's type or status. */
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Sticky actions at the bottom of the drawer. */
  footer?: ReactNode;
}

/**
 * Right-hand detail drawer for a selected record (resource, IDoc, recommendation…): 440px wide,
 * full width on phones. Modal: Escape closes it, focus stays inside and returns to the row that
 * opened it.
 */
export function DetailDrawer({ title, subtitle, onClose, children, footer }: DetailDrawerProps) {
  const titleId = useId();
  const panelRef = useModalOverlay<HTMLElement>(onClose);
  return (
    <div className="mv-drawer-backdrop" onClick={onClose}>
      <section ref={panelRef} className="mv-drawer mv-detail-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <header className="mv-drawer-header">
          <div className="mv-detail-drawer-title">
            <h2 className="mv-panel-title" id={titleId}>{title}</h2>
            {subtitle && <div className="mv-muted">{subtitle}</div>}
          </div>
          <button type="button" className="mv-icon-button" aria-label="Close details" onClick={onClose} data-autofocus>
            <CloseIcon size={18} />
          </button>
        </header>
        <div className="mv-drawer-body mv-detail-drawer-body">{children}</div>
        {footer && <footer className="mv-detail-drawer-footer">{footer}</footer>}
      </section>
    </div>
  );
}

/** A label/value list for drawer bodies. */
export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="mv-detail-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
