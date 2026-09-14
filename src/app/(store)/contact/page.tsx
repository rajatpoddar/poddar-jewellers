import { getShop } from '@/lib/shop';
import { ButtonLink } from '@/components/ui/Button';

export default async function ContactPage() {
  const rawShop = await getShop();
  const shop = rawShop as typeof rawShop & {
    whatsappNumber?: string;
    openingHoursText?: string;
    googleMapsUrl?: string;
  };
  const whatsappNumber = shop.whatsappNumber || (shop as { whatsapp?: string }).whatsapp || '';
  const openingHoursText = shop.openingHoursText || (shop as { hoursText?: string }).hoursText || '';
  const googleMapsUrl = shop.googleMapsUrl || shop.mapUrl;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="border-b border-line pb-4">
        <h1 className="font-display text-4xl text-ink font-bold">Contact & Location</h1>
        <p className="text-ink-muted text-sm mt-1">Aapke nazdeeki jewellery shop par aaiye</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-ink font-semibold">{shop.name}</h2>
          <div className="text-ink-muted text-sm space-y-1">
            <p>{shop.addressLine1}</p>
            {shop.addressLine2 && <p>{shop.addressLine2}</p>}
            <p>{shop.city}, {shop.state} - {shop.pincode}</p>
          </div>
          <div className="pt-2 text-sm text-ink-muted space-y-1">
            <p><strong className="text-ink">Phone:</strong> <span className="numeric">{shop.phone}</span></p>
            {openingHoursText && <p><strong className="text-ink">Timing:</strong> {openingHoursText}</p>}
          </div>
          <div className="pt-4">
            <ButtonLink href={`https://wa.me/${whatsappNumber}`} intent="primary" size="lg">
              WhatsApp Chat
            </ButtonLink>
          </div>
        </div>

        {googleMapsUrl && (
          <div className="bg-surface-sunk border border-line rounded-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-xl text-ink font-semibold mb-2">Google Map Location</h3>
              <p className="text-sm text-ink-muted">Shop par aane ke liye Google Maps direction lein.</p>
            </div>
            <div className="mt-6">
              <ButtonLink href={googleMapsUrl} intent="secondary" size="md" target="_blank" rel="noopener noreferrer">
                Google Maps Directions
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
