import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Select } from './Select';
import { DEFAULT_PAGE_SIZES, pageWindow } from './usePagination';
import { Tooltip } from './Tooltip';
import { useDensity } from './useDensity';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Plural noun for the summary, e.g. "logs" → "Showing 1–10 of 42 logs". */
  noun?: string;
}

/**
 * Table footer: range summary, page-size picker and numbered page buttons.
 * Sits inside the table's container so the table and its paging read as one
 * surface. Renders nothing when the list is empty.
 */
export function Pagination({
  page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = DEFAULT_PAGE_SIZES, noun = 'records',
}: PaginationProps) {
  const [density, setDensity] = useDensity();
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);

  return (
    <nav className="mv-pagination" aria-label="Pagination">
      <p className="mv-pagination-summary">
        Showing <strong>{from}–{to}</strong> of <strong>{total}</strong> {noun}
      </p>
      <div className="mv-pagination-controls">
        <div className="mv-density-toggle" role="group" aria-label="Row density">
          <Tooltip content="Roomier rows, easier to read">
            <button type="button" aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')}>Comfortable</button>
          </Tooltip>
          <Tooltip content="Tighter rows, more of the table on screen">
            <button type="button" aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}>Compact</button>
          </Tooltip>
        </div>
        {onPageSizeChange && (
          <Select
            label="Rows per page"
            hideLabel
            className="mv-pagination-size"
            value={pageSize}
            onChange={onPageSizeChange}
            options={pageSizeOptions.map((n) => ({ value: n, label: `${n} / page` }))}
          />
        )}
        {totalPages > 1 && (
          <div className="mv-pagination-pages">
            <button
              type="button"
              className="mv-pagination-btn"
              aria-label="Previous page"
              disabled={current <= 1}
              onClick={() => onPageChange(current - 1)}
            >
              <ChevronLeftIcon size={16} />
            </button>
            {pageWindow(current, totalPages).map((token) =>
              typeof token === 'number' ? (
                <button
                  key={token}
                  type="button"
                  className={`mv-pagination-btn${token === current ? ' is-active' : ''}`}
                  aria-label={`Page ${token}`}
                  aria-current={token === current ? 'page' : undefined}
                  onClick={() => onPageChange(token)}
                >
                  {token}
                </button>
              ) : (
                <span key={token} className="mv-pagination-gap" aria-hidden>…</span>
              ),
            )}
            <button
              type="button"
              className="mv-pagination-btn"
              aria-label="Next page"
              disabled={current >= totalPages}
              onClick={() => onPageChange(current + 1)}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
