import { Shop } from '@prisma/client';

export function Footer({
  shop,
}: {
  shop: Shop & { openingHoursText?: string; disclaimerText?: string };
}) {
  const openingHoursText = shop.openingHoursText || shop.hoursText;
  const disclaimerText = shop.disclaimerText || shop.priceDisclaimer;

  return (
    <footer className="border-t border-line bg-surface text-ink-muted text-sm py-8 px-4 mt-16">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-display text-lg text-ink mb-2">{shop.name}</h3>
          <p>{shop.addressLine1}{shop.addressLine2 ? `, ${shop.addressLine2}` : ''}</p>
          <p>{shop.city}, {shop.state} - {shop.pincode}</p>
        </div>
        <div>
          <h4 className="font-medium text-ink mb-2">Timing & Contact</h4>
          <p>Hours: {openingHoursText}</p>
          <p suppressHydrationWarning>
            Phone:{' '}
            {shop.phone ? (
              <a href={`tel:${shop.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-brand transition-colors">
                {shop.phone}
              </a>
            ) : (
              'N/A'
            )}
          </p>
        </div>
        <div>
          <h4 className="font-medium text-ink mb-2">Disclaimer</h4>
          <p className="text-xs text-ink-faint">{disclaimerText}</p>
        </div>
      </div>
    </footer>
  );
}
