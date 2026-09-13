'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { saveSettings, type SaveSettingsState } from './actions';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { CardFieldset } from '@/components/ui/Surface';

function Text({
  name,
  label,
  value,
  hint,
}: {
  name: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={name}>
      <Input id={name} name={name} defaultValue={value} />
    </Field>
  );
}

/**
 * A swatch beside the hex, both editable and kept in step.
 *
 * A bare <input type="color"> shows no value at all, so the shop cannot read
 * back what it picked, write a hex down, or paste one from a designer.
 */
function Colour({
  name,
  label,
  value,
  hint,
}: {
  name: string;
  label: string;
  value: string;
  hint?: string;
}) {
  const [colour, setColour] = useState(value);

  return (
    <Field label={label} hint={hint} htmlFor={name}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={`${label} — rang chuniye`}
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          className="size-11 shrink-0 cursor-pointer rounded-field border border-line-strong bg-surface p-1"
        />
        <Input
          id={name}
          name={name}
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          spellCheck={false}
          width="auto"
          className="w-32 font-mono uppercase"
        />
      </div>
    </Field>
  );
}

export function SettingsForm({
  shop,
  displayFonts,
  bodyFonts,
}: {
  shop: Record<string, string | number | null>;
  displayFonts: readonly string[];
  bodyFonts: readonly string[];
}) {
  const [state, action, pending] = useActionState<SaveSettingsState, FormData>(saveSettings, {});
  const str = (k: string) => String(shop[k] ?? '');
  const pct = (k: string) => String(Number(shop[k] ?? 0) / 100);
  const rup = (k: string) => String(Number(shop[k] ?? 0) / 100);

  return (
    <form action={action} className="max-w-2xl space-y-6">
      <CardFieldset title="Dukaan">
        <Text name="name" label="Naam" value={str('name')} />
        <Text name="tagline" label="Tagline" value={str('tagline')} />
        <Text name="hoursText" label="Timing" value={str('hoursText')} />
      </CardFieldset>

      <CardFieldset
        title="Branding"
        hint="Website ke rang aur font. Har dukaan apni pehchaan ke saath dikhe."
      >
        <Colour name="brandPrimary" label="Main colour" value={str('brandPrimary')}
          hint="Button, link aur highlight isi rang ke hote hain." />
        <Colour name="brandInk" label="Text ka colour" value={str('brandInk')} />
        <Colour name="brandGround" label="Background" value={str('brandGround')} />

        <Field
          label="Heading ka font"
          htmlFor="fontDisplay"
          hint="Sirf yahi font is website me maujood hain."
        >
          <Select id="fontDisplay" name="fontDisplay" defaultValue={str('fontDisplay')}>
            {displayFonts.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Text ka font" htmlFor="fontBody">
          <Select id="fontBody" name="fontBody" defaultValue={str('fontBody')}>
            {bodyFonts.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Field>
      </CardFieldset>

      <CardFieldset title="Sampark">
        <Text name="phone" label="Phone" value={str('phone')} />
        <Text name="whatsapp" label="WhatsApp" value={str('whatsapp')}
          hint="Country code ke saath, bina + ke. Jaise 919876543210" />
        <Text name="email" label="Email" value={str('email')} />
        <Text name="instagramUrl" label="Instagram" value={str('instagramUrl')} />
        <Text name="facebookUrl" label="Facebook" value={str('facebookUrl')} />
      </CardFieldset>

      <CardFieldset title="Pata">
        <Text name="addressLine1" label="Line 1" value={str('addressLine1')} />
        <Text name="addressLine2" label="Line 2" value={str('addressLine2')} />
        <Text name="city" label="Sheher" value={str('city')} />
        <Text name="state" label="Rajya" value={str('state')} />
        <Text name="pincode" label="Pincode" value={str('pincode')} />
        <Text name="mapUrl" label="Google Maps link" value={str('mapUrl')} />
      </CardFieldset>

      <CardFieldset
        title="Price"
        hint="Inme se kuch bhi badalne par poora catalog turant dobara calculate hota hai."
      >
        <Text name="defaultMakingPercentBp" label="Default making charge %"
          value={pct('defaultMakingPercentBp')} />
        <Text name="gstPercentBp" label="GST %" value={pct('gstPercentBp')}
          hint="CA se confirm kara lijiye." />
        <Text name="roundingStepPaise" label="Rounding step (₹)" value={rup('roundingStepPaise')} />
        <Text name="roundingSmallStepPaise" label="Chhoti keemat ka step (₹)"
          value={rup('roundingSmallStepPaise')} />
        <Text name="roundingThresholdPaise" label="Chhoti keemat ki seema (₹)"
          value={rup('roundingThresholdPaise')} />
        <Text name="priceDisclaimer" label="Price ke neeche ka text" value={str('priceDisclaimer')} />
      </CardFieldset>

      <CardFieldset title="Rate purana hone par">
        <Text name="rateWarnHours" label="Warning ke ghante" value={str('rateWarnHours')} />
        <Text name="rateStaleHours" label="Banner ke ghante" value={str('rateStaleHours')} />
        <Text name="rateBannerText" label="Banner ka text" value={str('rateBannerText')} />
      </CardFieldset>

      <CardFieldset title="Website">
        <Text name="heroHeading" label="Home page heading" value={str('heroHeading')} />
        <Text name="heroSubheading" label="Home page subheading" value={str('heroSubheading')} />
        <Text name="seoLocations" label="Jagah ke naam (SEO)" value={str('seoLocations')}
          hint="Comma se alag" />
      </CardFieldset>

      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.saved && <Notice tone="good">Save ho gaya.</Notice>}

      <Button type="submit" size="lg" disabled={pending} block>
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </Button>
    </form>
  );
}
