/**
 * Finds the element a guided-tour step points at. A step names its target as a string:
 *
 *   `css:<selector>`   the first element matching the CSS selector
 *   `btn:<label>`      the first button, link or tab whose visible text or aria-label contains the label
 *   `panel:<heading>`  the section/card whose heading starts with the text (e.g. `panel:Needs attention`)
 *   `none:`            nothing to outline: a step that only talks (the card is centred), e.g. a flow's last step
 *
 * Names rather than hard-coded markup keep tours working as pages are reshuffled, and a target that isn't
 * on the page (a module the org isn't subscribed to, an empty state) simply resolves to null so the step
 * can be skipped.
 */
const norm = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

function isVisible(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

const CONTAINER = 'section, article, .mv-panel, .mv-glance-col, .mv-module-card';
const HEADINGS = 'h1, h2, h3, h4, .mv-panel-title, .mv-glance-title, .mv-section-title';

export function resolveTourTarget(spec: string, root: ParentNode = document): HTMLElement | null {
  const colon = spec.indexOf(':');
  if (colon < 0) return null;
  const kind = spec.slice(0, colon);
  const value = spec.slice(colon + 1);
  const scope: ParentNode = root.querySelector?.('main') ?? root;

  if (kind === 'css') {
    for (const el of Array.from(scope.querySelectorAll(value))) if (isVisible(el)) return el;
    for (const el of Array.from(root.querySelectorAll(value))) if (isVisible(el)) return el;
    return null;
  }

  if (kind === 'btn') {
    const wanted = norm(value);
    const candidates = Array.from(scope.querySelectorAll('button, a, [role="tab"]')).filter(isVisible);
    const text = (el: HTMLElement) => norm(el.innerText || el.textContent || el.getAttribute('aria-label'));
    return candidates.find((el) => text(el) === wanted) ?? candidates.find((el) => text(el).includes(wanted)) ?? null;
  }

  if (kind === 'panel') {
    const wanted = norm(value);
    const heading = Array.from(scope.querySelectorAll(HEADINGS)).find((h) => norm(h.textContent).startsWith(wanted) && isVisible(h));
    if (!heading) return null;
    const box = heading.closest(CONTAINER) ?? heading.parentElement;
    return box && isVisible(box) ? box : null;
  }

  return null;
}
