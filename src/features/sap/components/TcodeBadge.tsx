/** The SAP transaction code a card is built from ("ST22", "SM37"), set in the small mono badge MIO uses. */
export function TcodeBadge({ code }: { code: string }) {
  return <span className="mv-tcode" title={`SAP transaction ${code}`}>{code}</span>;
}
