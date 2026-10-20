import { Link } from 'react-router-dom';
import { LockIcon } from '../../shared/ui/icons';
import type { ProductModule } from '../router/route-manifest';

const MODULE_LABEL: Record<ProductModule, string> = { cloudCost: 'Cloud Cost', sapMonitoring: 'SAP Monitoring' };

/**
 * What a page shows when it belongs to a module the organisation hasn't subscribed to (reached by a typed
 * address or an old link; the menus already hide such pages). Never a blank page, and it says how to get the module.
 */
export function ModuleNotSubscribed({ module }: { module: ProductModule }) {
  const label = MODULE_LABEL[module];
  return (
    <section className="mv-empty mv-access-denied" role="alert" aria-labelledby="module-not-subscribed-title">
      <div className="mv-empty-icon" aria-hidden><LockIcon size={28} /></div>
      <h2 id="module-not-subscribed-title">{label} isn’t part of your subscription</h2>
      <p>
        Your organisation doesn’t have the <strong>{label}</strong> module, so this page isn’t available. Ask Maitsys to add it, or see what your subscription includes.
      </p>
      <div className="mv-dialog-actions mv-access-denied-actions">
        <Link className="mv-secondary-button" to="/subscription">View subscription</Link>
        <Link className="mv-primary-button" to="/">Go to dashboard</Link>
      </div>
    </section>
  );
}
