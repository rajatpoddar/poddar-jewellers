'use client';

import { useState, useRef, useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice, Badge } from '@/components/ui/Notice';
import { CardFieldset } from '@/components/ui/Surface';
import {
  updateMetaSettingsAction,
  testMetaApiConnectionAction,
  type UpdateMetaSettingsState,
  type TestMetaConnectionResult,
} from '@/app/admin/(panel)/settings/actions';
import {
  validateMetaSettings,
  maskAccessToken,
  getMetaConnectionBadge,
  type MetaSettingsInput,
  type ValidatedMetaSettings,
  type MetaSettingsValidationResult,
} from './meta-settings-helpers';

export {
  validateMetaSettings,
  maskAccessToken,
  getMetaConnectionBadge,
  type MetaSettingsInput,
  type ValidatedMetaSettings,
  type MetaSettingsValidationResult,
};

export interface MetaSettingsFormProps {
  initialSettings?: {
    metaPhoneNumberId?: string | null;
    metaAccessToken?: string | null;
    metaWabaId?: string | null;
  } | null;
}

export function MetaSettingsForm({ initialSettings }: MetaSettingsFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, formAction, pending] = useActionState<UpdateMetaSettingsState, FormData>(
    updateMetaSettingsAction,
    {}
  );

  const [testState, setTestState] = useState<{
    loading: boolean;
    result?: TestMetaConnectionResult;
  }>({
    loading: false,
  });

  const isConfigured = Boolean(
    initialSettings?.metaPhoneNumberId && initialSettings?.metaAccessToken
  );

  const badge = getMetaConnectionBadge({
    isConfigured,
    isTested: Boolean(testState.result),
    testSuccess: testState.result?.success,
  });

  async function handleTestConnection() {
    setTestState({ loading: true });
    try {
      const formData = formRef.current ? new FormData(formRef.current) : new FormData();
      const result = await testMetaApiConnectionAction(formData);
      setTestState({
        loading: false,
        result,
      });
    } catch (err: unknown) {
      setTestState({
        loading: false,
        result: {
          success: false,
          error:
            err instanceof Error ? err.message : 'Meta API connection test fail ho gaya.',
        },
      });
    }
  }

  return (
    <form ref={formRef} action={formAction} className="max-w-2xl space-y-6">
      <CardFieldset
        title="Meta WhatsApp Cloud API"
        hint="Meta Graph API v19.0 credentials. Official WhatsApp templates aur automated transactional messages ke liye."
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-muted">Connection Status</span>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>

        <Field
          label="Phone Number ID"
          htmlFor="metaPhoneNumberId"
          hint="Meta WhatsApp App dashboard se Phone Number ID (jaise 10987654321)."
        >
          <Input
            id="metaPhoneNumberId"
            name="metaPhoneNumberId"
            defaultValue={initialSettings?.metaPhoneNumberId ?? ''}
            placeholder="10987654321"
            spellCheck={false}
          />
        </Field>

        <Field
          label="System User Access Token"
          htmlFor="metaAccessToken"
          hint="Meta Business Manager permanent System User token (whatsapp_business_messaging permission ke saath)."
        >
          <Input
            id="metaAccessToken"
            name="metaAccessToken"
            type="password"
            defaultValue={initialSettings?.metaAccessToken ?? ''}
            placeholder="EAAB..."
            spellCheck={false}
            autoComplete="off"
          />
        </Field>

        <Field
          label="WhatsApp Business Account ID (WABA ID)"
          htmlFor="metaWabaId"
          hint="Optional: Meta Business Suite se WhatsApp Business Account ID (template sync aur catalog linking ke liye)."
        >
          <Input
            id="metaWabaId"
            name="metaWabaId"
            defaultValue={initialSettings?.metaWabaId ?? ''}
            placeholder="20987654321"
            spellCheck={false}
          />
        </Field>

        {saveState.error && <Notice tone="danger">{saveState.error}</Notice>}
        {saveState.saved && (
          <Notice tone="good">Meta WhatsApp Cloud API credentials safalta se save ho gaye.</Notice>
        )}

        {testState.result && (
          <Notice tone={testState.result.success ? 'good' : 'danger'}>
            {testState.result.success
              ? testState.result.message
              : testState.result.error || 'Meta API connection fail ho gaya.'}
          </Notice>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Save ho raha hai…' : 'Save Meta Credentials'}
          </Button>

          <Button
            type="button"
            intent="secondary"
            onClick={handleTestConnection}
            disabled={testState.loading || pending}
          >
            {testState.loading ? 'Testing Connection…' : 'Test Meta API Connection'}
          </Button>
        </div>
      </CardFieldset>
    </form>
  );
}
