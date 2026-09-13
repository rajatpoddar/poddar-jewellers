import Link from 'next/link';
import { getShop, getMetalTypes } from '@/lib/shop';
import { getLatestRate } from '@/lib/rates.server';
import { rateStatus } from '@/lib/rates';
import { RateForm, type RateField } from '@/components/admin/RateForm';

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
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">Aaj ka Rate</h1>
        <p className="text-stone-600 mt-1">
          Rate bhariye aur Save dabaiye. Poori website apne aap update ho jayegi.
        </p>
      </div>

      {status !== 'FRESH' && (
        <div className="border border-amber-300 bg-amber-50 rounded p-4 text-amber-900">
          <strong>Rate purana hai.</strong>{' '}
          {latest
            ? `Aakhri baar ${latest.enteredAt.toLocaleString('en-IN')} ko update hua tha.`
            : 'Abhi tak koi rate nahi daala gaya.'}
        </div>
      )}

      {metals.length === 0 ? (
        <div className="border border-stone-300 bg-white rounded p-6">
          <p className="text-stone-700">
            Abhi koi metal type nahi hai. Pehle{' '}
            <Link href="/admin/metals" className="underline">Metal types</Link> me
            batayiye ki aapki dukaan kis-kis purity me kaam karti hai.
          </p>
        </div>
      ) : (
        <RateForm fields={fields} />
      )}

      {latest && (
        <p className="text-sm text-stone-500">
          Aakhri update: {latest.enteredAt.toLocaleString('en-IN')} · {latest.enteredBy}
        </p>
      )}
    </div>
  );
}
