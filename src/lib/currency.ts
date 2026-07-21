// LBP cash amounts round up to the nearest 5,000 note — the smallest
// denomination still practical in circulation — so a payable total is never
// something a customer can't actually hand over in cash.
export function roundLbpCash(lbp: number): number {
  return Math.ceil(lbp / 5000) * 5000;
}
