# Design System

**Read this before writing any interface code — a screen, a component, a
single button.** It is the UI half of what `CLAUDE.md` is to the project as a
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

## Visual direction

**Editorial Grid / Magazine**, chosen over the alternatives for three reasons:
large imagery is the point of a jewellery catalog, its performance cost is
`none` (no blur, no gradients, no compositing — Hard Rule 6 keeps the NAS out
of the hot path, and glassmorphism would put the customer's GPU there instead),
and it is the direction that survives contact with a serif display face.

What that means in practice:

| | |
|---|---|
| **Structure** | Grid-led, generous whitespace, hairline rules instead of shadows |
| **Type** | Serif display for headings, sans for everything else. Never the reverse |
| **Colour** | Ground, ink, one brand accent. The accent marks the primary action and nothing else |
| **Depth** | A 1px line first. A shadow only when something genuinely floats |
| **Radius** | Small and consistent. 4px on fields, 6px on cards, pill on badges |
| **Motion** | 180ms colour transitions on interactive things. Nothing moves on its own |

Explicitly rejected: glassmorphism and heavy blur, vibrant block colour,
playful palettes, gradient buttons, drop shadows used as decoration.

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

### Adding a token

Only when a genuinely new *meaning* appears — not a new shade. Add it to the
`@theme inline` block, derive it from a brand input with `color-mix` if it is
not a status colour, and add a row to the table above.

`@theme inline` is load-bearing: `inline` is what makes Tailwind emit
`var(--color-ink)` into each utility instead of copying today's hex in at build
time. Without it, one build could not serve a second shop's colours.

---

## Typography

| | |
|---|---|
| Display | `--brand-font-display`, applied by the base layer to `h1`–`h3` only |
| Body | `--brand-font-body`, 16px minimum, `line-height: 1.5`+ |
| Numerals | `.numeric` — tabular figures wherever digits are compared or stacked |

The display face is for headings. It is never used for body copy, form labels
or button text: a shopkeeper reads this on a phone in daylight, and a
high-contrast serif at 14px is not readable there.

Fonts come from `next/font/google` through the registry in `src/lib/branding.ts`
(see [D15](DECISIONS.md)). `Shop.fontDisplay` picks a name **from that registry**,
which is why the settings screen offers a dropdown and not a text box.

Currently registered — display: Instrument Serif, Cormorant, Playfair Display.
Body: Karla, Inter, Montserrat. Adding one for a new customer is one entry plus
one build, never a code branch.

---

## Components

`src/components/ui/` is the whole vocabulary. **Do not write a bare `<button>`
or `<input>` in a screen.** If a screen needs something this list does not have,
add it here first.

| Component | Use |
|---|---|
| `Button` / `ButtonLink` | `intent`: `primary` · `secondary` · `quiet` · `danger`. `size`: `md` (44px) · `lg` (52px) |
| `Field` | Visible label, control, hint, error — in that order |
| `Input` `Textarea` `Select` `Checkbox` | Form controls. `numeric` on `Input` for digits |
| `Card` `CardFieldset` `RowList` `EmptyState` | Containers. `CardFieldset` uses a real `<legend>` |
| `PageHeader` | Every screen opens with one: title, one sentence, primary action |
| `BackLink` | Every detail screen carries one |
| `Notice` | Page-level message. `tone`: `info` · `warn` · `danger` · `good` |
| `Badge` | A state label — LIVE, DRAFT, band |
| `icons.tsx` | Inline 24px stroke SVGs. No icon library, no emoji |

**`intent` is meaning, not appearance.** A screen asks for `danger` because the
action destroys something; the design system decides danger is red. That is what
stops the seventh shade of brown.

---

## Rules that are not negotiable

**Accessibility**

1. The focus ring is styled, never removed. The base layer sets it on
   `:focus-visible` for the whole document.
2. Text contrast ≥ 4.5:1. The seeded palette was measured: `#8F621A` is 5.34:1
   on white and 4.85:1 on the ground. **A shop that picks a new primary must be
   re-checked** — the token layer keeps it coherent, not necessarily legible.
3. Colour is never the only signal. `Notice` pairs every tone with an icon.
4. An icon-only control carries an `aria-label`. A decorative icon carries
   `aria-hidden` — `icons.tsx` does this for you.
5. Labels are visible and above the control. A placeholder is not a label.
6. Errors sit next to the field they belong to, not in a summary at the top.

**Touch and interaction**

7. Every target is at least 44×44px. All `Button` sizes and all form controls
   already clear it; anything hand-rolled must too.
8. Interactive elements get `cursor-pointer` and a hover state.
9. State changes are never instant and never slow: the 180ms default from
   `--default-transition-duration`. A bare `transition-colors` is already right.
10. `prefers-reduced-motion` is honoured globally by the base layer.

**Layout**

11. Mobile first. Verify at 375 / 768 / 1024 / 1440.
12. No horizontal scroll on the page. A wide table or tab strip scrolls inside
    its own container.
13. Images go through `next/image` with explicit dimensions. Never a raw `<img>` —
    it ships an unoptimised file and shifts the layout as it loads.

**Next.js**

14. Client components are leaves. A page is a server component; the interactive
    part inside it is `'use client'`. `Nav` / `NavLinks` is the pattern.
15. Data that only decides markup is fetched on the server and passed as props —
    see how `SettingsForm` receives the font list.

---

## Admin-specific

The admin is going to a non-technical user. Two rules on top of everything above:

- **Destructive never resembles safe.** Delete is `intent="danger"` with a
  trash icon, positioned away from Save. Reversible actions (deactivating a
  metal type) are `quiet` or `secondary`, never red.
- **Errors are readable sentences in Hinglish**, in a `Notice`, never a stack
  trace. That is Hard Rule 4 and it is a UI rule as much as a server one.

---

## Before calling a screen done

- [ ] No stock palette class, no literal hex — `npm test` proves it
- [ ] Every colour, radius and shadow is a token
- [ ] Rupees, weights and rates carry `.numeric`
- [ ] Labels visible; errors beside their field
- [ ] Focus visible on every interactive element; tab order is sane
- [ ] Touch targets ≥ 44px
- [ ] 375px: nothing clipped, nothing scrolling sideways
- [ ] Empty state written — what the shop sees before adding anything
- [ ] Pending state written — what the button says mid-save
- [ ] No emoji; icons are SVG and labelled or hidden
