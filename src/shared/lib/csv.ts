type Cell = string | number | boolean | null | undefined;

/** RFC 4180 quoting: wrap every cell, double embedded quotes. Keeps IDs such as
 * "0000000001234567" intact as text. */
export function toCsv(header: string[], rows: Cell[][]): string {
  const quote = (cell: Cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  return [header, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');
}

/** Byte-order mark so Excel opens the file as UTF-8. */
const BOM = String.fromCharCode(0xfeff);

/** Builds a CSV and hands it to the browser as a download. */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]): void {
  const blob = new Blob([BOM + toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
