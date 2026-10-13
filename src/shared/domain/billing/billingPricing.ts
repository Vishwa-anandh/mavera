/**
 * The Maitsys invoicing pricing engine — ported from the reference CCM app's
 * `pricingCalc.js` ("Maitsys CCM Invoicing Requirement Document, Section 8 —
 * Calculation Logic"). This is the ONLY place invoice math happens in
 * Mavera: InvoicePreview, the generate-flow Summary panel, and
 * CustomerInvoiceDetail all call these two functions rather than each
 * re-deriving totals inline. The reference app itself didn't hold this
 * line — InvoicePreview.jsx and UploadInvoiceForm.jsx's Summary panel each
 * hand-rolled a simpler formula with no per-line adjustment term, which
 * only ever agreed with the canonical engine because every invoice created
 * through the live UI hard-coded adjustmentPct to 0. Mavera has exactly one
 * engine so that can never silently drift.
 *
 * Order of operations, top to bottom:
 *   (per line)  discount -> per-line Maitsys adjustment
 *   (invoice)   sum of final line amounts -> overall "Summary" adjustment -> tax -> total
 * Each percentage is always applied against the PREVIOUS step's result,
 * never against the original raw total twice.
 */

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CalcLineInput {
  quantity: number;
  vendorUnitPrice: number;
  /** Pass explicitly when already known (e.g. extracted from a source
   * document); otherwise derived as quantity * vendorUnitPrice. */
  vendorLineTotal?: number;
  discountPct: number;
  adjustmentPct: number;
}

export interface CalcLineResult {
  vendorLineTotal: number;
  discountPctApplied: number;
  discountAmount: number;
  netAmountAfterDiscount: number;
  maitsysAdjustmentPctApplied: number;
  maitsysAdjustmentAmount: number;
  finalLineAmount: number;
}

/** One line item's math: discount first, then the Maitsys adjustment on
 * the post-discount net amount. A 0% discount/adjustment is an explicit
 * value that's always applied, never "skipped". */
export function calcLine(input: CalcLineInput): CalcLineResult {
  const vendorLineTotal = round2(input.vendorLineTotal ?? input.quantity * input.vendorUnitPrice);
  const discountAmount = round2(vendorLineTotal * (input.discountPct / 100));
  const netAmountAfterDiscount = round2(vendorLineTotal - discountAmount);
  const maitsysAdjustmentAmount = round2(netAmountAfterDiscount * (input.adjustmentPct / 100));
  const finalLineAmount = round2(netAmountAfterDiscount + maitsysAdjustmentAmount);

  return {
    vendorLineTotal,
    discountPctApplied: input.discountPct,
    discountAmount,
    netAmountAfterDiscount,
    maitsysAdjustmentPctApplied: input.adjustmentPct,
    maitsysAdjustmentAmount,
    finalLineAmount,
  };
}

export interface CalcInvoiceTotalsResult {
  lineSubtotal: number;
  overallAdjustmentAmount: number;
  subtotal: number;
  tax: number;
  totalDue: number;
}

/**
 * Invoice-level roll-up. Tax is always last, applied to the post-adjustment
 * subtotal — never to the raw line subtotal.
 */
export function calcInvoiceTotals(finalLineAmounts: number[], taxPct: number, overallAdjustmentPct = 0): CalcInvoiceTotalsResult {
  const lineSubtotal = round2(finalLineAmounts.reduce((sum, amount) => sum + amount, 0));
  const overallAdjustmentAmount = round2(lineSubtotal * (overallAdjustmentPct / 100));
  const subtotal = round2(lineSubtotal + overallAdjustmentAmount);
  const tax = round2(subtotal * (taxPct / 100));
  const totalDue = round2(subtotal + tax);

  return { lineSubtotal, overallAdjustmentAmount, subtotal, tax, totalDue };
}
