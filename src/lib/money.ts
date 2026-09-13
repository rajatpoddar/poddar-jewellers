/**
 * All money in this codebase is an integer number of paise.
 * All percentages are integer basis points: 15% is 1500, 3% is 300.
 * Never let a rupee value live in a float.
 */

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) {
    throw new Error(`rupeesToPaise: expected a non-negative finite number, got ${rupees}`);
  }
  // Round rather than truncate: 216.35 * 100 is 21634.999... in binary floating point.
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** value = paise * bp / 10000, rounded to the nearest paisa. */
export function applyPercentBp(paise: number, bp: number): number {
  if (!Number.isInteger(paise) || !Number.isInteger(bp)) {
    throw new Error(`applyPercentBp: expected integers, got (${paise}, ${bp})`);
  }
  return Math.round((paise * bp) / 10000);
}

/** Always rounds up. An estimate must never land under the real price. */
export function roundUpPaise(paise: number, stepPaise: number): number {
  if (!Number.isInteger(paise) || !Number.isInteger(stepPaise) || stepPaise <= 0) {
    throw new Error(`roundUpPaise: bad arguments (${paise}, ${stepPaise})`);
  }
  return Math.ceil(paise / stepPaise) * stepPaise;
}

/** Indian digit grouping, whole rupees. Rs 3,37,900 — never Rs 337,900. */
export function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
