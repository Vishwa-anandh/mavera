import { useState } from 'react';

export type PageToken = number | 'gap-start' | 'gap-end';

/**
 * The page numbers to show: every page up to 7, otherwise first, last and a
 * window around the current page with gaps ("…") between.
 */
export function pageWindow(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const tokens: PageToken[] = [1];
  const start = Math.max(2, Math.min(page - 1, totalPages - 4));
  const end = Math.min(totalPages - 1, Math.max(page + 1, 5));
  if (start > 2) tokens.push('gap-start');
  for (let p = start; p <= end; p += 1) tokens.push(p);
  if (end < totalPages - 1) tokens.push('gap-end');
  tokens.push(totalPages);
  return tokens;
}

export const DEFAULT_PAGE_SIZES = [10, 25, 50];

/** Client-side paging for an in-memory list; `resetKey` sends it back to page 1 (e.g. when a filter changes). */
export function usePagination<T>(items: readonly T[], initialPageSize = DEFAULT_PAGE_SIZES[0], resetKey = '') {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);
  return {
    page: current,
    pageSize,
    total: items.length,
    pageItems,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}
