import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateOtpCode, isOtpExpired, hashOtp, createOtpRecord, verifyOtpCode } from './otp';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    otpVerification: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('OTP Verification Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates 6-digit numeric OTP code', () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('correctly calculates OTP expiration', () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 300000);
    expect(isOtpExpired(past)).toBe(true);
    expect(isOtpExpired(future)).toBe(false);
  });

  it('consistently hashes OTP codes', () => {
    const hash1 = hashOtp('123456');
    const hash2 = hashOtp('123456');
    const hash3 = hashOtp('654321');
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('creates OTP record in DB with hashed OTP and 5min expiry', async () => {
    vi.mocked(db.otpVerification.create).mockResolvedValue({} as any);

    const code = await createOtpRecord('shop-1', '9876543210');
    expect(code).toMatch(/^\d{6}$/);
    expect(db.otpVerification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shopId: 'shop-1',
        phone: '919876543210',
        otpHash: hashOtp(code),
        expiresAt: expect.any(Date),
      }),
    });
  });

  describe('verifyOtpCode', () => {
    it('returns error if no OTP record found', async () => {
      vi.mocked(db.otpVerification.findFirst).mockResolvedValue(null);

      const result = await verifyOtpCode('shop-1', '9876543210', '123456');
      expect(result).toEqual({
        success: false,
        error: 'OTP record not found. Please request a new OTP.',
      });
    });

    it('returns error if OTP is expired', async () => {
      vi.mocked(db.otpVerification.findFirst).mockResolvedValue({
        id: 'otp-1',
        shopId: 'shop-1',
        phone: '919876543210',
        otpHash: hashOtp('123456'),
        expiresAt: new Date(Date.now() - 10000),
        attempts: 0,
        verifiedAt: null,
        createdAt: new Date(),
      } as any);

      const result = await verifyOtpCode('shop-1', '9876543210', '123456');
      expect(result).toEqual({
        success: false,
        error: 'OTP has expired. Please request a new OTP.',
      });
    });

    it('returns error and increments attempts if code is incorrect', async () => {
      vi.mocked(db.otpVerification.findFirst).mockResolvedValue({
        id: 'otp-1',
        shopId: 'shop-1',
        phone: '919876543210',
        otpHash: hashOtp('123456'),
        expiresAt: new Date(Date.now() + 300000),
        attempts: 1,
        verifiedAt: null,
        createdAt: new Date(),
      } as any);
      vi.mocked(db.otpVerification.update).mockResolvedValue({} as any);

      const result = await verifyOtpCode('shop-1', '9876543210', '999999');
      expect(result).toEqual({
        success: false,
        error: 'Invalid OTP code. Please try again.',
      });
      expect(db.otpVerification.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attempts: 2 },
      });
    });

    it('returns error if attempts >= 3', async () => {
      vi.mocked(db.otpVerification.findFirst).mockResolvedValue({
        id: 'otp-1',
        shopId: 'shop-1',
        phone: '919876543210',
        otpHash: hashOtp('123456'),
        expiresAt: new Date(Date.now() + 300000),
        attempts: 3,
        verifiedAt: null,
        createdAt: new Date(),
      } as any);

      const result = await verifyOtpCode('shop-1', '9876543210', '123456');
      expect(result).toEqual({
        success: false,
        error: 'Too many failed attempts. Please request a new OTP.',
      });
    });

    it('successfully verifies correct OTP code', async () => {
      vi.mocked(db.otpVerification.findFirst).mockResolvedValue({
        id: 'otp-1',
        shopId: 'shop-1',
        phone: '919876543210',
        otpHash: hashOtp('123456'),
        expiresAt: new Date(Date.now() + 300000),
        attempts: 0,
        verifiedAt: null,
        createdAt: new Date(),
      } as any);
      vi.mocked(db.otpVerification.update).mockResolvedValue({} as any);

      const result = await verifyOtpCode('shop-1', '9876543210', '123456');
      expect(result).toEqual({ success: true });
      expect(db.otpVerification.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { verifiedAt: expect.any(Date) },
      });
    });
  });
});
