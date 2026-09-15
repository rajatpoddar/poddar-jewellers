import { describe, it, expect } from 'vitest';
import { signCustomerToken, verifyCustomerToken } from './customer-session';

describe('Customer Session Token', () => {
  it('signs and verifies customer JWT payload', async () => {
    const token = await signCustomerToken(
      { customerId: 'cust-123', shopId: 'shop-1' },
      'secret-key-min-32-chars-test-secret'
    );
    const payload = await verifyCustomerToken(token, 'secret-key-min-32-chars-test-secret');
    expect(payload).toMatchObject({ customerId: 'cust-123', shopId: 'shop-1' });
  });
});
