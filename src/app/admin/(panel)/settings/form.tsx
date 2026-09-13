'use client';

import type { ReactNode } from 'react';
import { useActionState } from 'react';
import { saveSettings, type SaveSettingsState } from './actions';

const field = 'w-full border border-stone-300 rounded px-3 py-2.5';

function Text({
  name, label, value, hint, type = 'text',
}: {
  name: string; label: string; value: string; hint?: string; type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-stone-600">{label}</span>
      <input name={name} type={type} defaultValue={value} className={type === 'color' ? 'h-10 w-24 border border-stone-300 rounded' : field} />
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="bg-white border border-stone-200 rounded p-6 space-y-4">
      <legend className="px-2 text-sm font-medium text-stone-900">{title}</legend>
      {hint && <p className="text-sm text-stone-500">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function SettingsForm({ shop }: { shop: Record<string, string | number | null> }) {
  const [state, action, pending] = useActionState<SaveSettingsState, FormData>(saveSettings, {});
  const str = (k: string) => String(shop[k] ?? '');
  const pct = (k: string) => String(Number(shop[k] ?? 0) / 100);
  const rup = (k: string) => String(Number(shop[k] ?? 0) / 100);

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <Group title="Dukaan">
        <Text name="name" label="Naam" value={str('name')} />
        <Text name="tagline" label="Tagline" value={str('tagline')} />
        <Text name="hoursText" label="Timing" value={str('hoursText')} />
      </Group>

      <Group title="Branding" hint="Website ke rang aur font. Har dukaan apni pehchaan ke saath dikhe.">
        <Text name="brandPrimary" label="Main colour" value={str('brandPrimary')} type="color" />
        <Text name="brandInk" label="Text ka colour" value={str('brandInk')} type="color" />
        <Text name="brandGround" label="Background" value={str('brandGround')} type="color" />
        <Text name="fontDisplay" label="Heading ka font" value={str('fontDisplay')} hint="Google Fonts ka naam" />
        <Text name="fontBody" label="Text ka font" value={str('fontBody')} hint="Google Fonts ka naam" />
      </Group>

      <Group title="Sampark">
        <Text name="phone" label="Phone" value={str('phone')} />
        <Text name="whatsapp" label="WhatsApp" value={str('whatsapp')} hint="Country code ke saath, bina + ke. Jaise 919876543210" />
        <Text name="email" label="Email" value={str('email')} />
        <Text name="instagramUrl" label="Instagram" value={str('instagramUrl')} />
        <Text name="facebookUrl" label="Facebook" value={str('facebookUrl')} />
      </Group>

      <Group title="Pata">
        <Text name="addressLine1" label="Line 1" value={str('addressLine1')} />
        <Text name="addressLine2" label="Line 2" value={str('addressLine2')} />
        <Text name="city" label="Sheher" value={str('city')} />
        <Text name="state" label="Rajya" value={str('state')} />
        <Text name="pincode" label="Pincode" value={str('pincode')} />
        <Text name="mapUrl" label="Google Maps link" value={str('mapUrl')} />
      </Group>

      <Group title="Price" hint="Inme se kuch bhi badalne par poora catalog turant dobara calculate hota hai.">
        <Text name="defaultMakingPercentBp" label="Default making charge %" value={pct('defaultMakingPercentBp')} />
        <Text name="gstPercentBp" label="GST %" value={pct('gstPercentBp')} hint="CA se confirm kara lijiye." />
        <Text name="roundingStepPaise" label="Rounding step (₹)" value={rup('roundingStepPaise')} />
        <Text name="roundingSmallStepPaise" label="Chhoti keemat ka step (₹)" value={rup('roundingSmallStepPaise')} />
        <Text name="roundingThresholdPaise" label="Chhoti keemat ki seema (₹)" value={rup('roundingThresholdPaise')} />
        <Text name="priceDisclaimer" label="Price ke neeche ka text" value={str('priceDisclaimer')} />
      </Group>

      <Group title="Rate purana hone par">
        <Text name="rateWarnHours" label="Warning ke ghante" value={str('rateWarnHours')} />
        <Text name="rateStaleHours" label="Banner ke ghante" value={str('rateStaleHours')} />
        <Text name="rateBannerText" label="Banner ka text" value={str('rateBannerText')} />
      </Group>

      <Group title="Website">
        <Text name="heroHeading" label="Home page heading" value={str('heroHeading')} />
        <Text name="heroSubheading" label="Home page subheading" value={str('heroSubheading')} />
        <Text name="seoLocations" label="Jagah ke naam (SEO)" value={str('seoLocations')} hint="Comma se alag" />
      </Group>

      {state.error && <p className="text-red-700">{state.error}</p>}
      {state.saved && <p className="text-green-800">Save ho gaya.</p>}

      <button type="submit" disabled={pending}
        className="bg-stone-900 text-white rounded px-8 py-3 disabled:opacity-60">
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </button>
    </form>
  );
}
