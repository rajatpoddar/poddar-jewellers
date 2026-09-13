import Link from 'next/link';
import { getShop, getMetalTypes } from '@/lib/shop';
import { getLatestRate } from '@/lib/rates.server';
import { rateStatus } from '@/lib/rates';
import { RateForm, type RateField } from '@/components/admin/RateForm';
import { PageHeader, Card, EmptyState } from '@/components/ui/Surface';
import { Notice } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';

export default async function DailyRatePage() {
  const [shop, metals, latest] = await Promise.all([getShop(), getMetalTypes(), getLatestRate()]);

  const status = latest
    ? rateStatus(latest.enteredAt, new Date(), shop.rateWarnHours, shop.rateStaleHours)
    : 'STALE';

  const fields: RateField[] = metals.map((m) => ({
    metalTypeId: m.id,
    label: m.label,
    previousRupees: (latest?.rates[m.key] ?? 0) / 100,
  }));

  return (
    <div className="space-y-7">
      <PageHeader
        title="Aaj ka Rate"
        description="Rate bhariye aur Save dabaiye. Poori website apne aap update ho jayegi."
      />

      {status !== 'FRESH' && (
        <Notice tone="warn" title="Rate purana hai.">
          {latest
            ? `Aakhri baar ${latest.enteredAt.toLocaleString('en-IN')} ko update hua tha.`
            : 'Abhi tak koi rate nahi daala gaya.'}
        </Notice>
      )}

      {metals.length === 0 ? (
        <Card>
          <EmptyState title="Abhi koi metal type nahi hai">
            Pehle{' '}
            <Link href="/admin/metals" className="text-brand underline underline-offset-2">
              Metal types
            </Link>{' '}
            me batayiye ki aapki dukaan kis-kis purity me kaam karti hai.
          </EmptyState>
        </Card>
      ) : (
        <RateForm fields={fields} />
      )}

      {latest && (
        <p className="text-sm text-ink-faint">
          Aakhri update: {latest.enteredAt.toLocaleString('en-IN')} · {latest.enteredBy}
        </p>
      )}
    </div>
  );
}
