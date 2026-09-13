import { getShop } from '@/lib/shop';
import { SettingsForm } from './form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const shop = await getShop();
  // Dates cannot cross the server/client boundary as-is; this form only reads
  // scalars, so serialise them plainly.
  const plain = JSON.parse(JSON.stringify(shop)) as Record<string, string | number | null>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">Settings</h1>
        <p className="text-stone-600 mt-1">Dukaan ki har jankari yahin se badalti hai.</p>
      </div>
      <SettingsForm shop={plain} />
    </div>
  );
}
