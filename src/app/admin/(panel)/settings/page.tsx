import { getShop } from '@/lib/shop';
import { DISPLAY_FONT_NAMES, BODY_FONT_NAMES } from '@/lib/branding';
import { PageHeader } from '@/components/ui/Surface';
import { SettingsForm } from './form';
import { MetaSettingsForm } from '@/components/admin/MetaSettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const shop = await getShop();
  // Dates cannot cross the server/client boundary as-is; this form only reads
  // scalars, so serialise them plainly.
  const plain = JSON.parse(JSON.stringify(shop)) as Record<string, string | number | null>;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Dukaan ki har jankari yahin se badalti hai." />
      {/* The font lists come from the build's registry, not from this form, so
          the shop can only pick a face this deployment actually carries. */}
      <SettingsForm
        shop={plain}
        displayFonts={DISPLAY_FONT_NAMES}
        bodyFonts={BODY_FONT_NAMES}
      />
      <MetaSettingsForm
        initialSettings={{
          metaPhoneNumberId: shop.metaPhoneNumberId,
          metaAccessToken: shop.metaAccessToken,
          metaWabaId: shop.metaWabaId,
        }}
      />
    </div>
  );
}
