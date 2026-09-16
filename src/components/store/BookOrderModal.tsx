'use client';

import { useState } from 'react';
import { bookOrderAction } from '@/app/(store)/orders/actions';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea, Checkbox } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import Link from 'next/link';

interface BookOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  weightMg: number;
  weightGrams: number;
  formattedPrice: string;
  initialCustomer?: { name: string; phone: string } | null;
}

export function BookOrderModal({
  isOpen,
  onClose,
  productId,
  productName,
  weightMg,
  weightGrams,
  formattedPrice,
  initialCustomer,
}: BookOrderModalProps) {
  const [requiredByDate, setRequiredByDate] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [name, setName] = useState(initialCustomer?.name || '');
  const [phone, setPhone] = useState(initialCustomer?.phone || '');
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<{
    orderNumber: string;
    orderId: string;
  } | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await bookOrderAction({
      productId,
      weightMg,
      requiredByDate: requiredByDate || null,
      customerNotes: customerNotes || null,
      name,
      phone,
      marketingOptIn,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Order booking failed');
      return;
    }

    if (res.orderNumber && res.orderId) {
      setBookingSuccess({ orderNumber: res.orderNumber, orderId: res.orderId });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-surface border border-line rounded-card max-w-lg w-full p-6 shadow-xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Book / Reserve Design</h2>
            <p className="text-xs text-ink-muted mt-1">
              {productName} ({weightGrams}g) — <span className="numeric">{formattedPrice}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink text-xl font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {bookingSuccess ? (
          <div className="space-y-4 py-2">
            <Notice tone="good">
              <strong className="block font-semibold">Order Booked Successfully!</strong>
              <span>Aapka Order #: </span>
              <span className="font-bold numeric">{bookingSuccess.orderNumber}</span> confirm ho gaya hai.
            </Notice>
            <p className="text-sm text-ink-muted">
              Dukan visit karte samay yeh Order Number dikhayein. Shop team aapko confirm booking details pradan karegi.
            </p>
            <div className="flex gap-3 pt-2">
              <Link href="/orders" className="flex-1">
                <Button intent="primary" size="md" className="w-full justify-center">
                  My Orders Dekhein →
                </Button>
              </Link>
              <Button intent="quiet" size="md" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Notice tone="danger">{error}</Notice>}

            {!initialCustomer && (
              <div className="space-y-4 border-b border-line pb-4">
                <Field label="Aapka Naam">
                  <Input
                    type="text"
                    placeholder="E.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="WhatsApp Mobile Number">
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </Field>
              </div>
            )}

            <Field label="Shaadi / Festival Date (Optional)">
              <Input
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
              />
              <p className="text-xs text-ink-faint mt-1">
                Kis date tak aapko yeh jewellery chahiye (shadi ya tyohar ke liye)
              </p>
            </Field>

            <Field label="Khaas Hidayat / Notes (Optional)">
              <Textarea
                placeholder="Size ya koi special customisation ki requirement..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
              />
            </Field>

            <Checkbox
              label="WhatsApp par festive offers aur design updates receive karein"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            />

            <div className="flex gap-3 pt-4 border-t border-line">
              <Button type="submit" intent="primary" size="lg" className="flex-1 justify-center" disabled={loading}>
                {loading ? 'Booking Processing...' : 'Confirm Reserve / Book'}
              </Button>
              <Button type="button" intent="quiet" size="lg" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
