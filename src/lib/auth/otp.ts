import crypto from 'crypto';
import { db } from '@/lib/db';
import { sanitizeIndianPhone } from '@/lib/whatsapp/evolution';

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
}

/**
 * Generates a 6-digit numeric OTP code (100000 to 999999).
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Checks if the given expiration date is in the past.
 */
export function isOtpExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

/**
 * Hashes an OTP string using SHA-256 for secure storage.
 */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Creates and stores a new OTP verification record in the database.
 * Expires in 5 minutes. Returns the raw 6-digit OTP code for dispatching.
 */
export async function createOtpRecord(shopId: string, phone: string): Promise<string> {
  const cleanPhone = sanitizeIndianPhone(phone);
  const code = generateOtpCode();
  const otpHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.otpVerification.create({
    data: {
      shopId,
      phone: cleanPhone,
      otpHash,
      expiresAt,
    },
  });

  return code;
}

/**
 * Verifies a submitted OTP code against the latest unverified record for shopId + phone.
 * Enforces 5-minute expiry and max 3 failed attempts limit.
 */
export async function verifyOtpCode(
  shopId: string,
  phone: string,
  code: string
): Promise<VerifyOtpResult> {
  const cleanPhone = sanitizeIndianPhone(phone);

  const record = await db.otpVerification.findFirst({
    where: {
      shopId,
      phone: cleanPhone,
      verifiedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!record) {
    return { success: false, error: 'OTP record not found. Please request a new OTP.' };
  }

  if (isOtpExpired(record.expiresAt)) {
    return { success: false, error: 'OTP has expired. Please request a new OTP.' };
  }

  if (record.attempts >= 3) {
    return { success: false, error: 'Too many failed attempts. Please request a new OTP.' };
  }

  const inputHash = hashOtp(code);
  if (inputHash !== record.otpHash) {
    await db.otpVerification.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });
    return { success: false, error: 'Invalid OTP code. Please try again.' };
  }

  await db.otpVerification.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  return { success: true };
}
