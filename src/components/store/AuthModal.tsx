'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input, Checkbox } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { CloseIcon } from '@/components/ui/icons';
import { getWishlistIds } from '@/lib/wishlist';
import {
  requestOtpAction,
  verifyOtpAction,
  completeCustomerRegistrationAction,
} from '@/app/(store)/login/actions';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function resetState() {
    setStep(1);
    setPhone('');
    setOtp('');
    setName('');
    setAddressLine1('');
    setCity('');
    setPincode('');
    setMarketingOptIn(true);
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.trim().length < 10) {
      setError('Kripya 10-digit mobile number enter karein.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await requestOtpAction(phone);
    setLoading(false);

    if (res.success) {
      setStep(2);
    } else {
      setError(res.error || 'OTP bhejane me samasya aayi.');
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.trim().length < 6) {
      setError('Kripya 6-digit OTP enter karein.');
      return;
    }

    setLoading(true);
    setError(null);

    const wishlistIds = getWishlistIds();
    const res = await verifyOtpAction(phone, otp, wishlistIds);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'OTP verification fail ho gaya.');
      return;
    }

    if (res.isNew) {
      setStep(3);
    } else {
      resetState();
      onClose();
      onSuccess?.();
      router.refresh();
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Kripya apna naam enter karein.');
      return;
    }

    setLoading(true);
    setError(null);

    const wishlistIds = getWishlistIds();
    const res = await completeCustomerRegistrationAction(
      phone,
      name,
      addressLine1,
      city,
      pincode,
      wishlistIds,
      marketingOptIn
    );
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Registration fail ho gaya.');
      return;
    }

    resetState();
    onClose();
    onSuccess?.();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-surface border border-line rounded-card shadow-card space-y-5 text-ink">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h2 className="font-display text-2xl font-bold text-ink">
            {step === 1 && 'Sign In / Register'}
            {step === 2 && 'Verify OTP'}
            {step === 3 && 'Complete Profile'}
          </h2>
          <Button intent="quiet" size="md" onClick={handleClose} aria-label="Close dialog">
            <CloseIcon />
          </Button>
        </div>

        {error && <Notice tone="danger" title={error} />}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Field
              label="Mobile Number"
              hint="WhatsApp par 6-digit OTP bheja jayega."
              htmlFor="auth-phone-input"
            >
              <Input
                id="auth-phone-input"
                type="tel"
                numeric
                placeholder="e.g. 9835112345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </Field>

            <Button
              type="submit"
              intent="primary"
              size="lg"
              block
              disabled={loading || phone.trim().length < 10}
            >
              {loading ? 'OTP Bhej Rahe Hain...' : 'OTP Bhejein'}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Field
              label="6-Digit OTP"
              hint={`OTP mobile number ${phone} par bheja gaya hai.`}
              htmlFor="auth-otp-input"
            >
              <Input
                id="auth-otp-input"
                type="text"
                numeric
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </Field>

            <div className="flex items-center justify-between text-xs">
              <Button
                type="button"
                intent="quiet"
                size="md"
                onClick={() => setStep(1)}
              >
                Mobile number badlein
              </Button>
            </div>

            <Button
              type="submit"
              intent="primary"
              size="lg"
              block
              disabled={loading || otp.trim().length < 6}
            >
              {loading ? 'Verify Ho Raha Hai...' : 'Verify & Continue'}
            </Button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-sm text-ink-muted">
              Pahli baar sign in karne ke liye apni jankari darj karein.
            </p>

            <Field label="Aapka Naam *" htmlFor="auth-name-input">
              <Input
                id="auth-name-input"
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field label="Address Line 1" htmlFor="auth-address-input">
              <Input
                id="auth-address-input"
                type="text"
                placeholder="e.g. Main Road, Chowk"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="City" htmlFor="auth-city-input">
                <Input
                  id="auth-city-input"
                  type="text"
                  placeholder="e.g. Town/City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>

              <Field label="Pincode" htmlFor="auth-pincode-input">
                <Input
                  id="auth-pincode-input"
                  type="text"
                  numeric
                  maxLength={6}
                  placeholder="e.g. 800001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </Field>
            </div>

            <Checkbox
              label="WhatsApp par festive offers aur design updates receive karein"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            />

            <Button
              type="submit"
              intent="primary"
              size="lg"
              block
              disabled={loading || !name.trim()}
            >
              {loading ? 'Account Ban Raha Hai...' : 'Profile Complete Karein'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
