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

describe('Phase 3 Schema Integrity', () => {
  it('has customer tag, campaign template and outreach log tables configured', () => {
    expect(db.customerTag).toBeDefined();
    expect(db.campaignTemplate).toBeDefined();
    expect(db.outreachLog).toBeDefined();
  });
});

describe('Phase 5 Schema Integrity', () => {
  it('has promotion, product promotion, and hero slide tables configured', () => {
    expect(db.promotion).toBeDefined();
    expect(db.productPromotion).toBeDefined();
    expect(db.heroSlide).toBeDefined();
  });
});

describe('Hermes Agent API Suite Schema Integrity', () => {
  it('has apiKey table configured', () => {
    expect(db.apiKey).toBeDefined();
  });
});



