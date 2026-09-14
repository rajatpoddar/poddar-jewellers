import { getShop } from '@/lib/shop';
import { getLatestRateSet } from '@/lib/rates.server';
import { formatINR } from '@/lib/money';
import { formatRateDate } from './rates-helper';

export default async function RatesPage() {
  const shop = await getShop();
  const rateSet = await getLatestRateSet();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl text-ink font-bold">Aaj ka Gold & Silver Rate</h1>
        <p className="text-ink-muted text-sm">
          {shop.city}, {shop.state} ke liye aaj ke certified metal rates
        </p>
      </div>

      {rateSet && rateSet.lines.length > 0 ? (
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <div className="p-4 border-b border-line bg-surface-sunk text-xs text-ink-muted flex justify-between items-center">
            <span>Last Updated: {formatRateDate(new Date(rateSet.effectiveAt))}</span>
            <span>Verified by {shop.name}</span>
          </div>
          <div className="divide-y divide-line">
            {rateSet.lines.map((line) => (
              <div key={line.metalType.id} className="p-6 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">{line.metalType.label}</h2>
                  <p className="text-xs text-ink-faint">Per gram rate</p>
                </div>
                <div className="font-display text-2xl font-bold text-ink numeric">
                  {formatINR(line.pricePerGramPaise)} / g
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-ink-muted py-8 bg-surface rounded-card border border-line">
          Rate detail abhi available nahi hai.
        </div>
      )}
    </div>
  );
}
