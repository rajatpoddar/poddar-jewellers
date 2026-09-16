'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Card, CardFieldset, RowList, EmptyState, PageHeader } from '@/components/ui/Surface';
import { Notice, Badge } from '@/components/ui/Notice';
import { CopyIcon, CheckIcon, TrashIcon, KeyIcon, PlusIcon } from '@/components/ui/icons';
import { createApiKeyAction, deleteApiKeyAction } from './actions';

export interface SerializedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysClient({ keys }: { keys: SerializedApiKey[] }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setNewRawKey(null);
    setCopied(false);

    startTransition(async () => {
      const res = await createApiKeyAction(name);
      if (res.success && res.rawKey) {
        setNewRawKey(res.rawKey);
        setName('');
      } else {
        setError(res.error || 'API Key banane me samasya aayi.');
      }
    });
  }

  function handleCopy() {
    if (!newRawKey) return;
    navigator.clipboard.writeText(newRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRevoke(id: string, keyName: string) {
    if (!confirm(`Kya aap "${keyName}" API Key ko revoke karna chahte hain? Yeh action wapas nahi ho sakta.`)) {
      return;
    }

    setError(null);
    setRevokingId(id);

    startTransition(async () => {
      const res = await deleteApiKeyAction(id);
      setRevokingId(null);
      if (!res.success) {
        setError(res.error || 'API Key revoke karne me samasya aayi.');
      }
    });
  }

  function formatDate(isoString: string) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hermes Agent API Keys"
        description="Hermes AI agent ke liye API keys generate aur manage karein. Nayi key sirf ek baar dikhayi jayegi."
      />

      {error && (
        <Notice tone="danger" title="Error">
          {error}
        </Notice>
      )}

      {newRawKey && (
        <div className="rounded-card border border-brand-line bg-brand-soft p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-brand">
              <KeyIcon />
            </span>
            <h3 className="font-display text-lg font-medium text-ink">
              Nayi API Key Ban Gayi Hai
            </h3>
          </div>
          <p className="text-sm text-ink-muted">
            Kripya is key ko abhi copy karke surakshit jagah save kar lein. Is window ke baad yeh full secret key dubara nahi dikhayi jayegi.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <div className="flex-1 font-mono text-sm numeric rounded-field border border-brand-line bg-surface px-3 py-2.5 text-ink select-all overflow-x-auto">
              {newRawKey}
            </div>
            <Button
              type="button"
              intent={copied ? 'secondary' : 'primary'}
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <CheckIcon /> Copied!
                </>
              ) : (
                <>
                  <CopyIcon /> Copy Key
                </>
              )}
            </Button>
            <Button
              type="button"
              intent="quiet"
              onClick={() => setNewRawKey(null)}
              className="shrink-0"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <CardFieldset
        title="Nayi API Key Banayein"
        hint="System ya environment ka naam likhein (e.g. Hermes Agent Production)"
      >
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Field label="Key Name" htmlFor="api-key-name">
              <Input
                id="api-key-name"
                type="text"
                placeholder="Hermes Agent Production"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                required
              />
            </Field>
          </div>
          <Button
            type="submit"
            intent="primary"
            disabled={isPending || !name.trim()}
            className="w-full sm:w-auto"
          >
            <PlusIcon /> {isPending ? 'Bana rahe hain...' : 'Generate API Key'}
          </Button>
        </form>
      </CardFieldset>

      <div className="space-y-4">
        <h2 className="font-display text-xl text-ink">Active API Keys ({keys.length})</h2>

        {keys.length === 0 ? (
          <Card>
            <EmptyState title="Koi API Key nahi hai">
              Aapne abhi tak Hermes Agent ke liye koi API key nahi banayi hai. Upar diye gaye form se nayi key banayein.
            </EmptyState>
          </Card>
        ) : (
          <RowList>
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-ink text-base">{k.name}</span>
                    <span className="font-mono text-xs font-medium px-2 py-0.5 rounded-field bg-surface-sunk text-ink-muted border border-line">
                      {k.keyPrefix}...
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-ink-faint flex-wrap">
                    <span>Created: {formatDate(k.createdAt)}</span>
                    <span className="flex items-center gap-1.5">
                      Last used:
                      {k.lastUsedAt ? (
                        <Badge tone="good">{formatDate(k.lastUsedAt)}</Badge>
                      ) : (
                        <Badge tone="neutral">Kabhi nahi</Badge>
                      )}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <Button
                    type="button"
                    intent="danger"
                    size="md"
                    onClick={() => handleRevoke(k.id, k.name)}
                    disabled={isPending || revokingId === k.id}
                  >
                    <TrashIcon />
                    {revokingId === k.id ? 'Revoking...' : 'Revoke'}
                  </Button>
                </div>
              </div>
            ))}
          </RowList>
        )}
      </div>
    </div>
  );
}
