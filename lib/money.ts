/** The number part of a naira amount, e.g. 1500 -> "1,500". */
export function nairaDigits(amount: number): string {
  return Math.round(amount).toLocaleString("en-NG");
}

/** Full display string, e.g. 1500 -> "₦1,500". Never abbreviate ("1.5k") in the UI. */
export function naira(amount: number): string {
  return `₦${nairaDigits(amount)}`;
}
