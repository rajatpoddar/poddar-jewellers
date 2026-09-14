/**
 * Prompts that turn a supplier's tray photo into one product's three website
 * photos. The long form of this method, and the reasoning behind it, is in
 * `docs/AI-IMAGERY.md`; this module is what the admin screen reads.
 *
 * Two decisions are load-bearing:
 *
 * A shot type is not a category. The shop's categories are rows it edits
 * itself, and another shop will name them differently or add ones this one has
 * never sold. What does not change between shops is how a kind of jewellery is
 * photographed: a hoop is shot on an ear whatever the shop calls it. Keying the
 * prompts to that keeps Hard Rule 8 intact — no shop needs a code edit to use
 * this screen. (D16)
 *
 * No colour and no purity is written down here. The background comes from the
 * shop's `brandGround` and the metal from its own `MetalType` rows, so the
 * prompts follow a shop that sells silver, or one whose catalogue sits on a
 * near-black ground. `design-system.test.ts` enforces the first half of that by
 * failing on any literal hex under `src/`.
 */

/** How the pieces are laid out in the tray photo, and so how one is addressed. */
export type AddressKind =
  /** A grid on a stepped velvet tray: needs a row and a position. */
  | 'row-and-piece'
  /** A single row of pairs on a roller: a position is enough. */
  | 'piece-only'
  /** Strands lying diagonally across the frame: counted from the top. */
  | 'sequence'
  /** Two necklaces layered over each other: inner or outer. */
  | 'layer';

export type LayerKey = 'inner' | 'outer';

export interface ShotType {
  /** Stable key. Stored nowhere, but it is what the screen's select submits. */
  key: string;
  /** Admin-facing, in the shop's own words. */
  label: string;
  address: AddressKind;
  /** Sold in twos, so the main shot must show both. */
  soldAsPair: boolean;
  /** What one unit is called inside the address sentence. */
  unitNoun: string;
  /** Describes the uploaded tray photo, so the AI knows what it is looking at. */
  scene: string;
  /** What to count before generating. Counting is what stops the drift. */
  study: string;
  /** How the isolated piece should be arranged in the output. */
  arrangement: string;
  /** Output shape for the main shot. Portrait for anything long. */
  aspect: string;
  /** What the zoom shot fills the frame with. */
  zoomFocus: string;
  /** The body and crop of the worn shot. Must keep the face out. */
  worn: string;
  /** Anything in this tray that is not jewellery and must go. */
  extraIgnore?: string;
  /** A sentence after the ignore list, for a part that must survive it. */
  ignoreNote?: string;
  /** A mistake this particular material invites, stated before the AI makes it. */
  critical?: string;
  /** The same guard, restated for the zoom and worn passes. */
  criticalShort?: string;
  extraNegative?: string;
}

const VELVET = 'This is a jewellery catalogue tray photo.';

export const SHOT_TYPES: ShotType[] = [
  {
    key: 'jhumka',
    label: 'Jhumka / latkan earrings',
    address: 'row-and-piece',
    soldAsPair: true,
    unitNoun: 'pair',
    scene: `${VELVET} Several earring pairs are arranged in rows on black velvet.`,
    study:
      'Study the chosen pair before generating. Count the hanging drops. Note the shape of the top stud, the shape of the main body, and the engraving on it.',
    arrangement:
      'both earrings of that one pair, side by side as mirror images, standing upright',
    aspect: 'Square 1:1',
    zoomFocus: 'the left earring',
    worn: "Close-up of a South Asian woman's ear and jawline, cropped above the mouth so the face is not visible. Warm medium-brown skin, soft natural daylight, dark hair pinned back at the edge of frame.",
  },
  {
    key: 'tops',
    label: 'Tops / studs',
    address: 'row-and-piece',
    soldAsPair: true,
    unitNoun: 'piece',
    scene: `${VELVET} Small round earring studs are laid face-up in rows on black velvet.`,
    study:
      'Study the chosen piece. Count the petals and the openwork sections. Note the beaded rim.',
    arrangement: 'a matching pair of that stud, side by side, face-up',
    aspect: 'Square 1:1',
    zoomFocus: 'one stud, shot at a slight three-quarter angle so the depth of the openwork shows',
    worn: "Very close crop of a South Asian woman's earlobe, showing only the lower ear and a little of the jaw and neck, so the face is not visible. Warm medium-brown skin, soft natural daylight.",
    critical:
      'CRITICAL: ignore any green wax visible through the openwork. That is packing from behind the piece. The finished piece is solid metal with open gaps and no green anywhere.',
    criticalShort: 'There must be no green wax anywhere in the openwork.',
    extraNegative: 'green wax, green filling',
  },
  {
    key: 'locket',
    label: 'Locket / pendant',
    address: 'row-and-piece',
    soldAsPair: false,
    unitNoun: 'pendant',
    scene: `${VELVET} Pendants are laid out in rows on black velvet.`,
    study:
      'Study the chosen pendant. Count the beads on the border and the strands of the fringe. Note the shape of the central motif and the bail at the top.',
    arrangement: 'that single pendant alone, face-up and upright, with no chain',
    aspect: 'Square 1:1',
    zoomFocus: 'the central motif of the pendant',
    worn: "Close-up of a South Asian woman's neck and collarbones, cropped just below the mouth so the face is not visible. Warm medium-brown skin, soft natural daylight. She wears a plain deep red silk blouse at the bottom of the frame, and the pendant hangs on a plain thin chain that stays visually quiet.",
  },
  {
    key: 'bali',
    label: 'Bali / hoop',
    address: 'row-and-piece',
    soldAsPair: true,
    unitNoun: 'hoop',
    scene: `${VELVET} Hoop earrings are scattered on black velvet.`,
    study:
      'Study the chosen hoop. Note the thickness of the ring, how far the decorated section runs along it, the count of beads, and the shape of the hanging drop.',
    arrangement:
      'a matching pair of that hoop, side by side as mirror images, standing upright',
    aspect: 'Square 1:1',
    zoomFocus: 'the decorated lower section of one hoop',
    worn: "Close-up of a South Asian woman's ear and jawline, cropped above the mouth so the face is not visible. Warm medium-brown skin, hair pulled back so the whole hoop is visible, soft natural daylight.",
  },
  {
    key: 'ranihaar',
    label: 'Rani haar / lamba haar',
    address: 'layer',
    soldAsPair: false,
    unitNoun: 'necklace',
    scene:
      'This is a jewellery catalogue photo containing two necklaces layered over each other on black velvet.',
    study:
      'Study the chosen necklace carefully. Count its layers or strands. Count the hanging drops in the fringe. Note the width and pattern of the chain, the shape of the side connector plates, and the shape of the central pendant.',
    arrangement: 'that single necklace alone, laid flat in an open U-shape',
    aspect: 'Portrait 4:5',
    zoomFocus: 'the central pendant of the necklace',
    worn: "Close-up of a South Asian woman's neck, collarbones and upper chest, cropped just below the mouth so the face is not visible. Warm medium-brown skin, soft natural daylight. She wears a deep red silk saree blouse with a fine gold zari border at the bottom of the frame.",
    extraIgnore: 'the other necklace entirely',
  },
  {
    key: 'chain-heavy',
    label: 'Mardana chain (moti)',
    address: 'sequence',
    soldAsPair: false,
    unitNoun: 'chain',
    scene:
      'This is a jewellery catalogue photo. Several thick chains lie diagonally across black velvet.',
    study:
      'Study the chosen chain. Note the exact link shape, how the links alternate, and the engraving on them. Do not substitute a different link type.',
    arrangement: 'that single chain alone, laid in a wide open oval loop',
    aspect: 'Square 1:1',
    zoomFocus: 'a short section of the chain running diagonally, about eight links visible',
    worn: "Close-up of a South Asian man's neck, collarbones and upper chest, cropped just below the mouth so the face is not visible. Warm brown skin, short dark stubble at the jaw, an open-collared plain white cotton kurta, soft natural daylight.",
  },
  {
    key: 'chain-thin',
    label: 'Patli chain',
    address: 'sequence',
    soldAsPair: false,
    unitNoun: 'chain',
    scene:
      'This is a jewellery catalogue photo. Several thin chains lie diagonally across black velvet.',
    study:
      'Study the chosen chain. Note the exact link shape, how the links alternate, and any engraving. Keep it thin — it must not read as a heavy chain. Do not substitute a different link type.',
    arrangement: 'that single chain alone, laid in a soft open S-curve',
    aspect: 'Square 1:1',
    zoomFocus: 'a short section of the chain running diagonally, about ten links visible',
    worn: "Close-up of a South Asian woman's neck and collarbones, cropped just below the mouth so the face is not visible. Warm medium-brown skin, a plain deep red silk blouse at the bottom of the frame, soft natural daylight. The chain sits lightly on the skin.",
  },
  {
    key: 'bracelet',
    label: 'Bracelet',
    address: 'sequence',
    soldAsPair: false,
    unitNoun: 'bracelet',
    scene:
      'This is a jewellery catalogue photo. Thin bracelets lie diagonally across black velvet, each with a white paper hallmark tag attached at one end.',
    study:
      'Study the chosen bracelet. Note the link pattern, the position and shape of any beads or charms, and the clasp.',
    arrangement: 'that single bracelet alone, laid in a soft open circle',
    aspect: 'Square 1:1',
    zoomFocus: 'the centre section of the bracelet',
    worn: "Close-up of a South Asian woman's wrist and forearm resting on a plain surface, hand relaxed and slightly turned, cropped at the elbow so the face is not visible. Warm medium-brown skin, natural unpolished nails, soft window light from the left.",
    extraIgnore:
      'every white paper hallmark tag with everything printed on it, all barcodes and all QR codes',
    ignoreNote: 'The clasp stays. Only the tag goes.',
  },
  {
    key: 'shakha',
    label: 'Shakha (safed + sona)',
    address: 'piece-only',
    soldAsPair: true,
    unitNoun: 'pair',
    scene:
      'This is a jewellery catalogue photo. Several pairs of carved white conch-shell bangles with metal inlay are mounted on a white cylindrical roller against a black background.',
    study:
      'Study the chosen pair. Note the carved shell pattern, and exactly where the inlay sits and what shape it is.',
    arrangement: 'that one pair standing upright side by side, seen from the front',
    aspect: 'Square 1:1',
    zoomFocus: 'the inlay section of one bangle, showing both the carved shell and the metal in it',
    worn: "Close-up of a South Asian woman's forearms and wrists crossed in front of her, cropped at the elbows so the face is not visible. Warm medium-brown skin, a soft mehendi pattern on the backs of the hands, a deep red silk saree with a gold zari border at the edge of frame, soft natural daylight. She wears one bangle of the pair on each wrist.",
    extraIgnore: 'the white roller they are mounted on, the yellow thread',
    critical:
      'CRITICAL: the body of these bangles is carved cream-white conch shell, not metal. Only the inlaid pattern is metal. Keep the white parts white and keep the carved shell texture visible. Do not turn any part of the bangle into a solid metal bangle.',
    criticalShort:
      'The body of the bangle is carved cream-white conch shell and must stay white. Only the inlay is metal.',
    extraNegative: 'solid gold bangle, solid metal bangle, gold body, white parts turned to gold',
  },
];

export function getShotType(key: string): ShotType {
  return SHOT_TYPES.find((s) => s.key === key) ?? SHOT_TYPES[0];
}

export interface PromptFill {
  /** 1-based, counted from the top. Used by `row-and-piece` only. */
  row: number;
  /** 1-based, counted from the left, or from the top for `sequence`. */
  piece: number;
  /** Used by `layer` only. */
  layer: LayerKey;
  /** How this piece differs from the ones beside it. May be blank. */
  mark: string;
  /** A `MetalType.label` from this shop, e.g. "Gold 22K". */
  purityLabel: string;
}

export interface PromptBrand {
  /** The shop's `brandGround`, so the catalogue sits on its own background. */
  ground: string;
}

export interface BuiltPrompts {
  main: string;
  zoom: string;
  worn: string;
  negative: string;
}

/**
 * 1st, 2nd, 3rd, 4th. The teens are the reason this is a function: 11th and
 * 12th break a last-digit rule, and a wrong ordinal points the AI at the piece
 * next to the one the shop meant.
 */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function address(shot: ShotType, fill: PromptFill): string {
  switch (shot.address) {
    case 'row-and-piece':
      return `the ${ordinal(fill.piece)} ${shot.unitNoun} from the left in the ${ordinal(fill.row)} row from the top`;
    case 'piece-only':
      return `the ${ordinal(fill.piece)} ${shot.unitNoun} from the left`;
    case 'sequence':
      return `the ${ordinal(fill.piece)} ${shot.unitNoun} counting from the top`;
    case 'layer':
      return fill.layer === 'outer'
        ? `the outer ${shot.unitNoun}, the longer one on the outside`
        : `the inner ${shot.unitNoun}, the shorter one in the centre`;
  }
}

/** Position alone picks the neighbour too often, so the mark is appended when given. */
function useOnly(shot: ShotType, fill: PromptFill): string {
  const mark = fill.mark.trim();
  const suffix = mark === '' ? '' : ` — the one with ${mark}`;
  return `USE ONLY: ${address(shot, fill)}${suffix}.`;
}

function ignore(shot: ShotType): string {
  const parts = [
    'every other piece in the frame',
    'all printed weight and size numbers',
    'any purity or code numbers',
  ];
  if (shot.extraIgnore) parts.push(shot.extraIgnore);
  parts.push("the photographer's watermark");
  const last = parts.pop();
  const list = `IGNORE AND REMOVE: ${parts.join(', ')}, and ${last}.`;
  return shot.ignoreNote ? `${list} ${shot.ignoreNote}` : list;
}

const NEGATIVE_BASE = [
  'watermark',
  'text',
  'numbers',
  'price tags',
  'hallmark tags',
  'barcodes',
  'logo',
  'signature',
  'black background',
  'second piece',
  'extra jewellery',
  'duplicate pieces',
  'added gemstones',
  'redesigned pattern',
  'extra granulation',
  'plastic look',
  'HDR glow',
  'harsh flash',
  'props',
  'clutter',
].join(', ');

/**
 * The three prompts for one product, plus the negative prompt that goes with
 * all of them. `main` reads the tray photo; `zoom` and `worn` read `main`'s
 * output. That second pass is the whole point — asking the AI to find the
 * piece in a crowded tray a second and third time is what makes the design
 * drift.
 */
export function buildPrompts(
  shot: ShotType,
  fill: PromptFill,
  brand: PromptBrand,
): BuiltPrompts {
  const surface = `a seamless flat ${brand.ground} background`;
  const metal = `The metal is ${fill.purityLabel}. Render its colour true to life — not orange, not brassy, no blown highlights.`;
  const light = 'Soft diffused light from the upper left';

  const main = [
    shot.scene,
    `${useOnly(shot, fill)}\n${ignore(shot)}`,
    shot.critical,
    `${shot.study} Reproduce exactly what is there — same counts, same shapes, same proportions.\nDo not restyle. Do not add granulation, beading or stones. Do not make it more ornate or more symmetrical than the original.`,
    `Output: ${shot.arrangement}, centred on ${surface}. ${light}, gentle bounce fill from the right, one soft natural shadow beneath. ${metal} ${shot.aspect}, the whole subject in frame with an even margin, sharp focus throughout, e-commerce catalogue style.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const zoom = [
    `Extreme close-up macro of ${shot.zoomFocus} from the uploaded image, filling about 80% of the frame.`,
    'Reproduce it exactly as uploaded — same motif, same counts, same engraving. Do not add extra granulation, beading or filigree. Do not make it more detailed than it is.',
    shot.criticalShort,
    `Background: ${surface} falling gently out of focus. ${light} revealing the real texture. Shallow depth of field. Square 1:1.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const worn = [
    `${shot.worn} Natural skin texture, no plastic retouching.`,
    'She is wearing the piece from the uploaded image. Keep the design identical — same shape, same counts, same proportions, and the same size relative to the body. Do not substitute a different piece.',
    shot.criticalShort,
    'Background: softly blurred and neutral. Editorial jewellery campaign photography. Portrait 4:5.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const negative = shot.extraNegative
    ? `${NEGATIVE_BASE}, ${shot.extraNegative}`
    : NEGATIVE_BASE;

  return { main, zoom, worn, negative };
}
