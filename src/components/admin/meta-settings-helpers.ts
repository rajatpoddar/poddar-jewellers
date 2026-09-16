/**
 * Pure helpers for Meta WhatsApp Cloud API credentials validation,
 * token masking, and connection badge display.
 */

export interface MetaSettingsInput {
  metaPhoneNumberId?: string | null;
  metaAccessToken?: string | null;
  metaWabaId?: string | null;
}

export interface ValidatedMetaSettings {
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
  metaWabaId: string | null;
}

export interface MetaSettingsValidationResult {
  valid: boolean;
  error?: string;
  data?: ValidatedMetaSettings;
}

/**
 * Validates and normalizes Meta Cloud API settings.
 * If all fields are empty or whitespace, credentials are reset to null.
 * If configured, phoneNumberId and accessToken are both required and formatted.
 */
export function validateMetaSettings(input: MetaSettingsInput): MetaSettingsValidationResult {
  const rawPhone = input.metaPhoneNumberId?.trim() || null;
  let rawToken = input.metaAccessToken?.trim() || null;
  const rawWaba = input.metaWabaId?.trim() || null;

  if (rawToken && rawToken.startsWith('Bearer ')) {
    rawToken = rawToken.slice(7).trim();
  }

  // Empty configuration is valid (allows resetting or unconfiguring)
  if (!rawPhone && !rawToken && !rawWaba) {
    return {
      valid: true,
      data: {
        metaPhoneNumberId: null,
        metaAccessToken: null,
        metaWabaId: null,
      },
    };
  }

  if (rawPhone && !rawToken) {
    return {
      valid: false,
      error: 'Phone Number ID ke saath Meta Access Token bhi aavashyak hai.',
    };
  }

  if (rawToken && !rawPhone) {
    return {
      valid: false,
      error: 'Access Token ke saath Meta Phone Number ID bhi aavashyak hai.',
    };
  }

  if (rawPhone && !/^\d+$/.test(rawPhone)) {
    return {
      valid: false,
      error: 'Phone Number ID sirf anko (digits) me hona chahiye.',
    };
  }

  if (rawWaba && !/^\d+$/.test(rawWaba)) {
    return {
      valid: false,
      error: 'WhatsApp Business Account ID (WABA ID) sirf anko (digits) me hona chahiye.',
    };
  }

  return {
    valid: true,
    data: {
      metaPhoneNumberId: rawPhone,
      metaAccessToken: rawToken,
      metaWabaId: rawWaba,
    },
  };
}

/**
 * Masks system user access token for safe display.
 */
export function maskAccessToken(token?: string | null): string {
  if (!token) return '';
  const trimmed = token.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  const start = trimmed.slice(0, 4);
  const end = trimmed.slice(-4);
  return `${start}••••••••${end}`;
}

/**
 * Returns badge tone and label reflecting Meta Cloud API configuration state.
 */
export function getMetaConnectionBadge(status: {
  isConfigured: boolean;
  isTested?: boolean;
  testSuccess?: boolean;
}): {
  tone: 'good' | 'warn' | 'danger' | 'neutral';
  label: string;
} {
  if (!status.isConfigured) {
    return { tone: 'neutral', label: 'Meta API: Not Configured' };
  }
  if (!status.isTested) {
    return { tone: 'warn', label: 'Meta API: Configured (Untested)' };
  }
  if (status.testSuccess) {
    return { tone: 'good', label: 'Meta API: Connected' };
  }
  return { tone: 'danger', label: 'Meta API: Connection Error' };
}
