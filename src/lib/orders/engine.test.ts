import { describe, it, expect } from 'vitest';
import { calculateOrderSnapshot } from './engine';

describe('Order Snapshot Calculation', () => {
  it('creates immutable itemized order price snapshot with GST and rounding', () => {
    const snapshot = calculateOrderSnapshot({
      weightMg: 20000,
      metalRatePaise: 750000, // Rs 7,500 / g
      makingPercentBp: 1500, // 15%
      stoneValuePaise: 0,
      gstPercentBp: 300, // 3%
    });

    expect(snapshot.metalPaise).toBe(15000000); // Rs 1,50,000
    expect(snapshot.makingPaise).toBe(2250000);  // Rs 22,500
    expect(snapshot.gstPaise).toBe(517500);     // Rs 5,175
    expect(snapshot.totalPaise).toBeGreaterThan(0);
  });
});
