import { getShop } from '@/lib/shop';
import { listApiKeys } from '@/lib/agent-auth.server';
import { ApiKeysClient, SerializedApiKey } from './ApiKeysClient';

export const metadata = {
  title: 'API Keys | Admin Panel',
};

export default async function ApiKeysPage() {
  const shop = await getShop();
  const rawKeys = await listApiKeys(shop.id);

  const keys: SerializedApiKey[] = rawKeys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  }));

  return <ApiKeysClient keys={keys} />;
}
