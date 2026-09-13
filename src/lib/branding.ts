import type { CSSProperties } from 'react';
import { Instrument_Serif, Cormorant, Playfair_Display, Karla, Inter, Montserrat } from 'next/font/google';

/**
 * The bridge between the `Shop` row and the CSS token layer in globals.css.
 *
 * Hard Rule 7 says a shop's colours and fonts are data, not source. But
 * `next/font/google` self-hosts its files at build time, so it cannot take a
 * font name that only exists in a database row at request time. The resolution
 * is a registry: the shop picks from fonts this build already carries, and the
 * settings screen offers exactly these names. See D15.
 *
 * Adding a font for a new customer is one entry here plus one build — no
 * per-shop code branch, which is what Hard Rule 8 actually asks for.
 */

const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' });
const cormorant = Cormorant({ subsets: ['latin'], display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' });

const karla = Karla({ subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap' });

/** Serif faces offered for headings. The key is what lands in `Shop.fontDisplay`. */
export const DISPLAY_FONTS = {
  'Instrument Serif': instrumentSerif,
  Cormorant: cormorant,
  'Playfair Display': playfair,
} as const;

/** Sans faces offered for body copy. The key is what lands in `Shop.fontBody`. */
export const BODY_FONTS = {
  Karla: karla,
  Inter: inter,
  Montserrat: montserrat,
} as const;

export type DisplayFontName = keyof typeof DISPLAY_FONTS;
export type BodyFontName = keyof typeof BODY_FONTS;

export const DISPLAY_FONT_NAMES = Object.keys(DISPLAY_FONTS) as DisplayFontName[];
export const BODY_FONT_NAMES = Object.keys(BODY_FONTS) as BodyFontName[];

/**
 * A shop row holds a plain string. If it names a font this build does not
 * carry — a typo, or a row restored from a build that had more fonts — fall
 * back to the first registered face rather than rendering in Times New Roman.
 */
function displayFont(name: string) {
  return (DISPLAY_FONTS[name as DisplayFontName] ?? DISPLAY_FONTS[DISPLAY_FONT_NAMES[0]]).style
    .fontFamily;
}

function bodyFont(name: string) {
  return (BODY_FONTS[name as BodyFontName] ?? BODY_FONTS[BODY_FONT_NAMES[0]]).style.fontFamily;
}

export interface BrandInputs {
  brandPrimary: string;
  brandInk: string;
  brandGround: string;
  fontDisplay: string;
  fontBody: string;
}

/**
 * The five custom properties globals.css derives every other token from.
 * Set on <html> so the whole cascade — storefront and admin — sees them.
 */
export function brandStyle(shop: BrandInputs): CSSProperties {
  return {
    '--brand-primary': shop.brandPrimary,
    '--brand-ink': shop.brandInk,
    '--brand-ground': shop.brandGround,
    '--brand-font-display': displayFont(shop.fontDisplay),
    '--brand-font-body': bodyFont(shop.fontBody),
  } as CSSProperties;
}
