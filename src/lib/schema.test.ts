import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';

describe('Phase 2 Schema Integrity', () => {
  it('has customer, order and activity tables configured', () => {
    expect(db.customer).toBeDefined();
    expect(db.customerSession).toBeDefined();
    expect(db.otpVerification).toBeDefined();
    expect(db.customerActivity).toBeDefined();
    expect(db.order).toBeDefined();
  });
});
