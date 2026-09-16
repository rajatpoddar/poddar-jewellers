import crypto from 'node:crypto';
import { db } from '@/lib/db';
import type { ApiKey, Shop } from '@prisma/client';

export interface GenerateApiKeyResult {
  rawKey: string;
  apiKey: ApiKey;
}

export interface AuthenticateAgentResult {
  shop: Shop;
  apiKey: ApiKey;
}

/**
 * Generates a new API key for the Hermes Agent.
 * Stores only the SHA-256 hash of the key in the database along with keyPrefix.
 * Returns the unhashed rawKey (shown to user/agent once) and created ApiKey record.
 */
export async function generateApiKey(
  shopId: string,
  name: string
): Promise<GenerateApiKeyResult> {
  const randomHex = crypto.randomBytes(32).toString('hex');
  const rawKey = `hermes_live_${randomHex}`;
  const keyPrefix = `hermes_live_${randomHex.slice(0, 4)}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await db.apiKey.create({
    data: {
      shopId,
      name,
      keyPrefix,
      keyHash,
    },
  });

  return {
    rawKey,
    apiKey,
  };
}

/**
 * Authenticates an incoming agent HTTP Request using Authorization or X-Hermes-API-Key header.
 * Hashes the incoming token and checks against database stored keyHashes.
 * Asynchronously updates lastUsedAt upon successful match.
 */
export async function authenticateAgentRequest(
  request: Request
): Promise<AuthenticateAgentResult | null> {
  const authHeader =
    request.headers.get('Authorization') ||
    request.headers.get('X-Hermes-API-Key');

  if (!authHeader) {
    return null;
  }

  const rawKey = authHeader.replace(/^Bearer\s*/i, '').trim();
  if (!rawKey) {
    return null;
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: { shop: true },
  });

  if (!apiKey) {
    return null;
  }

  // Update lastUsedAt asynchronously (fire-and-forget)
  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    shop: apiKey.shop,
    apiKey,
  };
}

/**
 * Revokes / deletes an API key by ID.
 */
export async function deleteApiKey(id: string): Promise<ApiKey> {
  return await db.apiKey.delete({
    where: { id },
  });
}

/**
 * Lists all API keys for a shop ordered by creation date descending.
 */
export async function listApiKeys(shopId: string): Promise<ApiKey[]> {
  return await db.apiKey.findMany({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
  });
}

