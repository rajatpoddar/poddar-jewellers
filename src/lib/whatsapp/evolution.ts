export interface EvolutionShopConfig {
  evolutionApiUrl: string;
  evolutionApiKey?: string | null;
  evolutionInstance: string;
}

export interface SendOtpResult {
  success: boolean;
  fallback: boolean;
  error?: string;
}

/**
 * Sanitizes an Indian phone number into international format (91XXXXXXXXXX).
 * Strips all non-digit characters and prepends '91' for 10-digit mobile numbers.
 */
export function sanitizeIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Builds the JSON payload for Evolution API sendText endpoint.
 */
export function buildEvolutionPayload(phone: string, text: string) {
  const number = sanitizeIndianPhone(phone);
  return {
    number,
    text,
  };
}

/**
 * Sends a WhatsApp OTP to the specified phone number via Evolution API HTTP POST.
 * If the API call fails or the server is offline, logs to stdout as a dev fallback.
 */
export async function sendWhatsAppOtp(
  shop: EvolutionShopConfig,
  phone: string,
  otp: string
): Promise<SendOtpResult> {
  const sanitized = sanitizeIndianPhone(phone);
  const message = `Aapka OTP hai ${otp}`;
  const payload = buildEvolutionPayload(sanitized, message);

  try {
    const url = `${shop.evolutionApiUrl.replace(/\/$/, '')}/message/sendText/${shop.evolutionInstance}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (shop.evolutionApiKey) {
      headers['apikey'] = shop.evolutionApiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Evolution API HTTP error ${response.status}`);
    }

    return { success: true, fallback: false };
  } catch (error) {
    console.log(`[WhatsApp OTP Fallback] Phone: ${sanitized} OTP: ${otp}`);
    return { success: true, fallback: true };
  }
}
