/**
 * Pagination helpers for long lists (e.g. the Reports violation log).
 */

/** Clamps a requested page to 1..totalPages (totalPages is at least 1). */
export function clampPage(page, totalPages) {
  const last = Math.max(1, totalPages);
  const value = Number.isFinite(page) ? Math.trunc(page) : 1;
  return Math.min(Math.max(1, value), last);
}

/** Total pages for `itemCount` items, at least 1. */
export function getTotalPages(itemCount, pageSize) {
  return Math.max(1, Math.ceil(Math.max(0, itemCount) / pageSize));
}

/**
 * Page buttons to show: always the first and last page, the current page and
 * `siblings` pages either side, with 'ellipsis' markers for skipped ranges.
 * A gap of exactly one page shows that page instead of an ellipsis.
 *
 * getPageItems(6, 20) → [1, 'ellipsis', 5, 6, 7, 'ellipsis', 20]
 */
export function getPageItems(currentPage, totalPages, siblings = 1) {
  const last = Math.max(1, totalPages);
  const current = clampPage(currentPage, last);
  const pages = new Set([1, last]);
  for (let page = current - siblings; page <= current + siblings; page += 1) {
    if (page >= 1 && page <= last) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && page - previous > 2) items.push('ellipsis');
    items.push(page);
  });
  return items;
}
