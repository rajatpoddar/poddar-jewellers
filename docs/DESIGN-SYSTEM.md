# Design System

**Read this before writing any interface code — a screen, a component, a
single button.** It is the UI half of what `AGENTS.md` is to the project as a
whole. If something here contradicts a screen you are looking at, the screen is
wrong.

Two things enforce it rather than ask for it:

- `src/lib/design-system.test.ts` walks `src/` and fails the suite on a stock
  Tailwind palette class, a literal hex, an untokenised radius, a raw `<img>`,
  or an emoji. It names the offending line and says what to use instead.
- `src/lib/no-hardcoded-shop.test.ts` does the same for shop facts (Hard Rule 7).

---

## The one idea

**Nothing in the interface picks a colour, a font or a radius. It asks for a
meaning, and the token layer decides what that looks like.**

A screen says `bg-surface`, never `bg-white`. It says `intent="danger"`, never
`bg-red-600`. This is not tidiness — it is Hard Rule 8. This software is sold
one deployment per shop. A second customer changes five values on their `Shop`
row and gets a coherent site; if any screen had picked its own brown, that
customer would get a blue site with one brown button.

```
Shop row (5 values)  →  brandStyle()  →  custom properties on <html>
                                              ↓
                              globals.css derives ~20 semantic tokens
                                              ↓
                              Tailwind utilities: bg-surface, text-ink-muted…
                                              ↓
                                   components/ui/  →  screens
```

---

## Visual direction — `ui-ux-pro-max` Luxury Showcase

**Editorial Luxury Showcase** (enhanced using `ui-ux-pro-max` design intelligence):
Large high-resolution imagery, warm stone surfaces, crisp typography with high-end editorial tracking, hairline gold/line borders, multi-slide Hero Carousel (`HeroCarousel.tsx`), and luxury trust pillars.

What that means in practice:

| | |
|---|---|
| **Structure** | Grid-led, generous whitespace, hairline rules, luxury card aspect containers |
| **Type** | High-end serif display for headings (Instrument Serif / Cormorant), sans for body (Karla / Montserrat). Never the reverse |
| **Colour** | Ground (`bg-ground`), warm surface (`bg-surface`), ink, one brand gold accent (`bg-brand`). The accent marks primary actions & trust highlights |
| **Depth** | Hairline borders (`border-line`) first. Elevation shadows (`shadow-card`) on floating cards and modal drawers |
| **Radius** | Small and consistent: `rounded-field` (4px), `rounded-card` (8px), `rounded-pill` for badges |
| **Motion** | 180ms colour transitions on interactive elements. 6s auto-slide for `HeroCarousel` |
| **AI Imagery** | AI prompts documented in `COMPLETE_IMAGE_PROMPTS.md` and `docs/AI-IMAGERY.md` |

Explicitly rejected: stock Tailwind palette colors, hardcoded hex values in screens, raw `<img>` tags, emojis as structural icons.

---

## Tokens

Defined in `src/app/globals.css`. **This is the only file in the repo allowed
to contain a hex colour.**

### Brand inputs — the five values a shop owns

Written onto `<html>` from the `Shop` row by `src/lib/branding.ts`.

| Custom property | `Shop` column | Seeded default |
|---|---|---|
| `--brand-primary` | `brandPrimary` | `#8F621A` |
| `--brand-ink` | `brandInk` | `#1A1D1B` |
| `--brand-ground` | `brandGround` | `#F4F4F2` |
| `--brand-font-display` | `fontDisplay` | Instrument Serif |
| `--brand-font-body` | `fontBody` | Karla |

The defaults in `globals.css` are the fallback every deployment starts from,
not this shop's identity. They exist so a page still renders if the database is
unreachable.

### Semantic tokens — what screens actually use

Everything below is derived from the three brand colours with `color-mix`, so a
shop that picks a different primary gets a coherent set rather than a gold UI
with one odd button.

| Utility | Means |
|---|---|
| `bg-ground` | The page behind everything |
| `bg-surface` | A card, a panel, an input |
| `bg-surface-sunk` | A subtle fill: hover on a row, a disabled field |
| `text-ink` | Primary text |
| `text-ink-muted` | Labels, secondary text |
| `text-ink-faint` | Metadata, hints, placeholders |
| `border-line` | A hairline between things |
| `border-line-strong` | The edge of something you can type into |
| `bg-brand` / `text-brand` | The primary action, and only the primary action |
| `bg-brand-strong` | Its hover |
| `text-brand-on` | Text sitting on the brand colour |
| `bg-brand-soft` / `border-brand-line` | A brand-tinted surface |
| `*-danger` `*-warn` `*-good` | Status. Fixed hues — red stays red whatever a shop picks |
| `rounded-field` `rounded-card` `rounded-pill` | The only three radii |
| `shadow-card` `shadow-raised` | The only two elevations |
| `font-display` `font-body` | The two faces |
| `.numeric` | Tabular figures. **Every rupee amount, weight and rate** |

---

## Components

`src/components/ui/` is the whole vocabulary. **Do not write a bare `<button>`
or `<input>` in a screen.**

| Component | Use |
|---|---|
| `Button` / `ButtonLink` | `intent`: `primary` · `secondary` · `quiet` · `danger`. `size`: `md` · `lg` |
| `Field` | Visible label, control, hint, error — in that order |
| `Input` `Textarea` `Select` `Checkbox` | Form controls. `numeric` on `Input` for digits |
| `Card` `CardFieldset` `RowList` `EmptyState` | Containers. `CardFieldset` uses a real `<legend>` |
| `PageHeader` | Every screen opens with one |
| `Notice` | Page-level message. `tone`: `info` · `warn` · `danger` · `good` |
| `Badge` | A state label — LIVE, DRAFT |
| `icons.tsx` | Inline 24px stroke SVGs |
