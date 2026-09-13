import { describe, it, expect, beforeAll } from 'vitest';
import { signSession, verifySession } from './session';

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-bytes-long!!';
});

describe('session tokens', () => {
  it('round-trips a payload', async () => {
    const token = await signSession({ sub: 'user_1', name: 'Rajat' });
    expect(await verifySession(token)).toMatchObject({ sub: 'user_1', name: 'Rajat' });
  });

  it('rejects a tampered token', async () => {
    const token = await signSession({ sub: 'user_1', name: 'Rajat' });
    expect(await verifySession(token.slice(0, -3) + 'aaa')).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession({ sub: 'user_1', name: 'Rajat' });
    process.env.SESSION_SECRET = 'a-completely-different-secret-of-length-32!';
    const result = await verifySession(token);
    process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-bytes-long!!';
    expect(result).toBeNull();
  });

  it('rejects nonsense', async () => {
    expect(await verifySession('not-a-jwt')).toBeNull();
    expect(await verifySession('')).toBeNull();
  });
});
