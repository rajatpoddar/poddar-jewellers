# AI Imagery Guide — Poddar Jewellers

*Dukaan-daar ke liye. Supplier ki tray photos se website ke images banane ka
tareeka — copy-paste karne layak prompts, category ke hisaab se.*

Ye guide `docs/PHOTOGRAPHY.md` ka saathi hai. Wo batata hai **nayi photo kaise
khinchni hai**; ye batata hai **jo tray photos pehle se hain, unse kaam kaise
chalana hai**.

Koi bhi image-edit karne wala AI chalega — ChatGPT, Grok, Gemini. Prompts
English me hain, teeno English me behtar chalte hain.

**Roz ke kaam ke liye ye poora doc padhne ki zarurat nahi.** Admin panel me
**Photo prompts** tab kholiye: cheez chuniye, row aur piece bhariye, aur teeno
prompt Copy button ke saath taiyar mil jayenge. Ye doc tab padhiye jab samajhna
ho ki prompt aisa kyun likha hai, ya kuch naya jodna ho.

---

## Asli dikkat: tray photo me ek product nahi hota

Supplier ki photo me 2 se 90 tak pieces ek saath hote hain, upar weight likha
hota hai, aur neeche photographer ka watermark. Aisi photo AI ko dene par teen
galtiyan pakki hain:

1. **Do product mila kar ek bana deta hai** — jaise dono haar ek hi set ho
2. **Galat piece uthata hai**
3. **Design badal deta hai** — bheed me se dhoondhne me hi uska poora dhyan lag
   jaata hai, nakkashi par nahi bachta

Teeno ka ek hi ilaaj hai: **do pass**, aur **saaf address**.

---

## Do pass ka tareeka

> **Pass 1 — alag karo.** Tray photo se sirf ek product nikalo, saaf background
> par. Is pass me aur kuch nahi karna. Yahi **Photo 1 (main)** ban jaata hai.
>
> **Pass 2 — baaki do.** Ab **Pass 1 ka output** upload karo, tray wali photo
> dobara nahi. Zoom aur pehne-hue dono isi saaf image se.

Pass 2 me tray photo dobara dena sabse badi galti hai. AI ko har baar bheed me
se dhoondhna padega, aur har baar design thoda aur badlega.

**Har product ke 3 photos:** `1 main` + `2 zoom` + `3 pehne hue`. Teen hi kaafi
hain. Isse zyada me dukaan ka roz ka kaam badh jaata hai aur page bhaari hota
hai.

---

## Address — AI ko kaise batayein ki kaunsa piece

Har prompt ek **address block** se shuru hota hai. Do line ka hai, aur yahi
poore system ka dil hai:

```
USE ONLY: [address]
IGNORE AND REMOVE: every other piece in the frame, all printed weight numbers,
all price or code numbers, and the photographer's watermark.
```

Address me **do cheezein saath likhiye** — sirf ginti kaafi nahi:

| Likhiye | Misaal |
|---|---|
| **Kahan hai** (ginti) | `the 3rd pair from the left in the 2nd row from the top` |
| **Kaisa dikhta hai** (pehchan) | `the one shaped like a crescent moon with a teardrop hanging below` |

Sirf ginti likhenge to AI aksar bagal wala utha leta hai. Sirf pehchan likhenge
to milte-julte design me confuse hota hai. **Dono saath = sahi piece.**

### Ginti ka niyam

- **Row** hamesha upar se neeche
- **Piece / Pair** hamesha bayein se dayein
- **Chain aur bracelet** (tirchhe pade hue) — upar se neeche, jahan wo baaye
  kinare se shuru hote hain
- **Haar** (do overlapping) — `inner` (beech wala, chhota) aur `outer` (bahar
  wala, lamba)

### Ginti ka number kabhi mat likhiye

`22.06gm` ya `750` ko pehchan ke liye **mat** likhiye — AI un numbers ko image
me hi chhaap deta hai. Numbers ka zikr sirf "hata do" wali line me.

### Bheed zyada ho to pehle crop kijiye

40 se zyada pieces wali tray me AI ki ginti bharosemand nahi rehti. Aisi photo
me **pehle us row ko crop kar lijiye** (Preview me 10 second ka kaam), phir
address me likhiye `the 3rd pair from the left`. Ginti ki galti wahin khatam.

---

## Aapke media folder me kya-kya hai

| Category | Files | Tray kaisa hai | Address kaise likhein |
|---|---|---|---|
| 1. Jhumka / latkan earrings | `...32.jpg`, `...32 2.jpg` | Kaali velvet, 5 row × 4 pair | row + pair |
| 2. Tops / studs | `...38 4.jpg`, `...37 2.jpg`, `...37 3.jpg` | Kaali velvet, bikhre hue | row + piece |
| 3. Locket / pendant | `...38.jpg`, `...38 2.jpg`, `...38 3.jpg` | Kaali velvet, row me | row + piece |
| 4. Bali (hoop) | `...35.jpg` | Kaali velvet, 4/3/2/1 | row + piece |
| 5. Rani haar / lamba haar | `...34 3.jpg`, `...35 2.jpg`, `...35 3.jpg` | 2 haar overlapping | inner / outer |
| 6. Mardana chain (moti) | `...33 2.jpg` | 6 tirchhi chains | upar se ginti |
| 7. Patli chain | `...34 4.jpg` | 6 tirchhi chains | upar se ginti |
| 8. Bracelet | `...33.jpg` | 3 tirchhi, tag lage hue | upar se ginti |
| 9. Shakha (safed + sona) | `...36.jpg`, `...36 2.jpg`, `...36 3.jpg`, `...36 4.jpg`, `...37.jpg` | Safed roller par jode | bayein se pair |

`750` jahan likha hai wo **18K** hai — un prompts me `22K` ki jagah `18K`
likhiye.

---

# Category 1 — Jhumka / latkan earrings

Jode me bikte hain, isliye **dono** dikhne chahiye.

### 1. Main

```
This is a jewellery catalogue tray photo. Several earring pairs are arranged
in rows on black velvet.

USE ONLY: the [3rd] pair from the left in the [2nd] row from the top — [the one
whose lower part is a crescent with a small teardrop hanging below].
IGNORE AND REMOVE: every other pair in the frame, all printed weight numbers,
and the photographer's watermark.

Study the chosen pair before generating. Count the hanging drops. Note the
shape of the top stud, the shape of the main body, and the engraving on it.
Reproduce exactly what is there — same counts, same shapes, same proportions.
Do not restyle. Do not add granulation, beading or stones. Do not make it more
ornate or more symmetrical than the original.

Output: both earrings of that one pair, side by side as mirror images, standing
upright, centred, on a seamless warm off-white (#F4F4F2) surface. Soft diffused
light from the upper left, gentle bounce fill from the right, one soft natural
shadow beneath each. 22K yellow gold, warm and true to colour, not orange, not
brassy, no blown highlights. Square 1:1, both pieces fully in frame with an
even margin, sharp focus throughout, e-commerce catalogue style.
```

### 2. Zoom

> Ab Pass 1 ka saaf image upload kijiye.

```
Extreme close-up macro of the left earring from the uploaded image, filling
about 80% of the frame. Reproduce it exactly as uploaded — same motif, same
number of drops, same engraving. Do not add extra granulation or filigree.
Warm off-white (#F4F4F2) background falling gently out of focus. Soft diffused
light revealing the real texture. Shallow depth of field. Square 1:1.
```

### 3. Pehne hue

```
Close-up of a South Asian woman's ear and jawline, cropped above the mouth so
the face is not visible. Warm medium-brown skin, soft natural daylight, natural
skin texture, no plastic retouching. Dark hair pinned back at the edge of frame.

She is wearing the earring from the uploaded image. Keep the design identical —
same shape, same number of drops, same size relative to the ear. Do not
substitute a different earring.

Background: softly blurred warm off-white studio wall. Editorial jewellery
campaign photography. Portrait 4:5.
```

---

# Category 2 — Tops / studs

Ye bhi jode me. Chhote hote hain, isliye zoom shot yahan sabse zaroori hai.

### 1. Main

```
This is a jewellery catalogue tray photo. Small round gold earring studs are
laid face-up in rows on black velvet.

USE ONLY: the [4th] piece from the left in the [1st] row from the top — [the
round openwork one with a five-petal flower at the centre].
IGNORE AND REMOVE: every other piece, the number "750", any other printed
numbers, and the photographer's watermark.

Study the chosen piece. Count the petals and the openwork sections. Note the
beaded rim. Reproduce exactly that — same counts, same shapes. Do not restyle,
do not add granulation or stones, do not make it more ornate.
Ignore any green wax visible through the openwork — the finished piece is solid
gold with open gaps.

Output: a matching pair of that stud, side by side, face-up, centred on a
seamless warm off-white (#F4F4F2) surface. Soft diffused light from the upper
left, one soft shadow beneath each. 18K yellow gold, warm and true to colour,
not orange, not brassy. Square 1:1, even margin, sharp throughout,
e-commerce catalogue style.
```

### 2. Zoom

```
Extreme close-up macro of one stud from the uploaded image, filling the frame,
shot at a slight three-quarter angle so the depth of the openwork is visible.
Reproduce it exactly as uploaded — same petal count, same rim, same openwork.
Do not add detail. Warm off-white (#F4F4F2) background out of focus. Soft
diffused light. Square 1:1.
```

### 3. Pehne hue

```
Very close crop of a South Asian woman's earlobe, cropped so only the lower
ear and a little of the jaw and neck are visible. Warm medium-brown skin, soft
natural daylight, natural skin texture.

She is wearing the stud from the uploaded image. Keep the design identical and
keep it small and proportionate to the earlobe — do not enlarge it.

Softly blurred warm off-white background. Editorial jewellery photography.
Square 1:1.
```

---

# Category 3 — Locket / pendant

Locket akela bikta hai, chain ke bina. Pehne hue shot me patli chain dikhaiye
par prompt me saaf likhiye ki chain product ka hissa nahi hai.

### 1. Main

```
This is a jewellery catalogue tray photo. Gold pendants are laid out in rows
on black velvet.

USE ONLY: the [5th] pendant from the left in the [2nd] row from the top — [the
heart-shaped one with a beaded scalloped border and a short chain fringe at the
bottom].
IGNORE AND REMOVE: every other pendant, the number "750", any other printed
numbers, and the photographer's watermark.

Study the chosen pendant. Count the beads on the border and the strands of the
fringe. Note the shape of the central motif and the bail at the top.
Reproduce exactly that. Do not restyle, do not add granulation or stones, do
not make it more ornate.

Output: that single pendant alone, face-up, upright, centred on a seamless warm
off-white (#F4F4F2) surface. No chain. Soft diffused light from the upper left,
one soft natural shadow beneath. 18K yellow gold, warm and true to colour, not
orange, not brassy. Square 1:1, even margin, sharp throughout, e-commerce
catalogue style.
```

### 2. Zoom

```
Extreme close-up macro of the pendant from the uploaded image, filling about
80% of the frame, focused on the central motif. Reproduce it exactly as
uploaded — same motif, same border, same fringe count. Do not add detail.
Warm off-white (#F4F4F2) background out of focus. Soft diffused light.
Square 1:1.
```

### 3. Pehne hue

```
Close-up of a South Asian woman's neck and collarbones, cropped just below the
mouth so the face is not visible. Warm medium-brown skin, soft natural
daylight, natural skin texture.

She is wearing the pendant from the uploaded image on a plain thin gold chain.
Keep the pendant identical to the uploaded image. The chain must be very
simple and unobtrusive — the pendant is the subject.

She wears a plain deep red silk blouse at the bottom of the frame. Softly
blurred warm off-white background. Editorial jewellery campaign photography.
Portrait 4:5.
```

---

# Category 4 — Bali (hoop)

### 1. Main

```
This is a jewellery catalogue tray photo. Gold hoop earrings are scattered on
black velvet.

USE ONLY: the [2nd] hoop from the left in the [1st] row from the top — [the one
with a row of small beads along the lower half and a small teardrop hanging
below].
IGNORE AND REMOVE: every other hoop, all printed numbers, and the
photographer's watermark.

Study the chosen hoop. Note the thickness of the ring, how far the decorated
section runs along it, the count of beads, and the shape of the hanging drop.
Reproduce exactly that. Do not restyle, do not add beads or stones.

Output: a matching pair of that hoop, side by side as mirror images, standing
upright, centred on a seamless warm off-white (#F4F4F2) surface. Soft diffused
light from the upper left, one soft shadow beneath each. 22K yellow gold, warm
and true to colour, not orange, not brassy. Square 1:1, even margin, sharp
throughout, e-commerce catalogue style.
```

### 2. Zoom

```
Extreme close-up macro of the decorated lower section of one hoop from the
uploaded image, filling the frame. Reproduce it exactly as uploaded — same bead
count, same engraving, same drop. Do not add detail. Warm off-white (#F4F4F2)
background out of focus. Shallow depth of field. Square 1:1.
```

### 3. Pehne hue

```
Close-up of a South Asian woman's ear and jawline, cropped above the mouth so
the face is not visible. Warm medium-brown skin, soft natural daylight, natural
skin texture. Hair pulled back so the full hoop is visible.

She is wearing the hoop earring from the uploaded image. Keep the design
identical and keep the hoop the same size relative to the ear.

Softly blurred warm off-white background. Editorial jewellery campaign
photography. Portrait 4:5.
```

---

# Category 5 — Rani haar / lamba haar

In photos me do haar ek doosre ke upar pade hain. `inner` = beech wala chhota,
`outer` = bahar wala lamba.

### 1. Main

```
This is a jewellery catalogue photo containing two necklaces layered over each
other on black velvet.

USE ONLY: the [outer] necklace — the longer one on the outside, [the one whose
pendant is a wide fan-shaped plate with a net pattern and a long chain fringe
below it].
IGNORE AND REMOVE: the other necklace completely, all printed weight numbers,
and the photographer's watermark. The output must contain exactly one necklace.

Study the chosen necklace carefully. Count its layers or strands. Count the
hanging drops in the fringe. Note the width and pattern of the chain, the shape
of the side connector plates, and the shape of the central pendant.
Reproduce exactly what is there — same counts, same shapes, same proportions.
Do not restyle. Do not add granulation, beading or stones. Do not make it more
ornate or more symmetrical than the original.

Output: that single necklace, laid flat in an open U-shape, centred on a
seamless warm off-white (#F4F4F2) surface. Soft diffused light from the upper
left, gentle bounce fill from the right, one soft natural shadow beneath.
22K yellow gold, warm and true to colour, not orange, not brassy, no blown
highlights. Portrait 4:5, the whole necklace fully in frame with an even
margin, sharp focus throughout, e-commerce catalogue style.
```

### 2. Zoom

```
Extreme close-up macro of the central pendant of the necklace in the uploaded
image, filling about 80% of the frame. Reproduce the pendant exactly as
uploaded — same motif, same number of rays and drops, same engraving. Do not
add extra granulation, beading or filigree. Do not make it more detailed than
it is. Warm off-white (#F4F4F2) background falling out of focus. Soft diffused
light revealing the real texture. Shallow depth of field. Square 1:1.
```

### 3. Pehne hue

```
Close-up of a South Asian woman's neck, collarbones and upper chest, cropped
just below the mouth so the face is not visible. Warm medium-brown skin, soft
natural daylight, natural skin texture, no plastic retouching.

She is wearing the necklace from the uploaded image. Keep the design identical
— same number of strands, same pendant, same fringe, same length and drape on
the body. Do not substitute a different necklace.

She wears a deep red silk saree blouse with a fine gold zari border at the
bottom of the frame. Softly blurred warm off-white background. Editorial
jewellery campaign photography. Portrait 4:5.
```

---

# Category 6 — Mardana chain (moti)

### 1. Main

```
This is a jewellery catalogue photo. Several thick gold chains lie diagonally
across black velvet.

USE ONLY: the [3rd] chain counting from the top — [the one made of flat
rectangular links with a Greek-key pattern engraved on them].
IGNORE AND REMOVE: every other chain, all printed weight numbers, and the
photographer's watermark.

Study the chosen chain. Note the exact link shape, how the links alternate, and
the engraving on them. Reproduce exactly that pattern. Do not restyle, do not
substitute a different link type, do not add stones.

Output: that single chain alone, laid in a wide open oval loop, centred on a
seamless warm off-white (#F4F4F2) surface. Soft diffused light from the upper
left, one soft natural shadow beneath. 22K yellow gold, warm and true to
colour, not orange, not brassy. Square 1:1, whole chain in frame with an even
margin, sharp focus throughout, e-commerce catalogue style.
```

### 2. Zoom

```
Extreme close-up macro of a short section of the chain from the uploaded image,
running diagonally across the frame, with about eight links visible.
Reproduce the link shape and engraving exactly as uploaded. Do not change the
pattern. Warm off-white (#F4F4F2) background out of focus. Soft diffused light
showing the cut and polish of each link. Shallow depth of field. Square 1:1.
```

### 3. Pehne hue

```
Close-up of a South Asian man's neck, collarbones and upper chest, cropped just
below the mouth so the face is not visible. Warm brown skin, short dark stubble
at the jaw, soft natural daylight, natural skin texture.

He is wearing the chain from the uploaded image. Keep the link pattern and the
thickness identical to the uploaded image.

He wears an open-collared plain white cotton kurta. Softly blurred warm
off-white background. Editorial jewellery campaign photography. Portrait 4:5.
```

---

# Category 7 — Patli chain

Category 6 ke prompts hi chalenge, teen badlaav ke saath:

- Address me `thick` ki jagah `thin` likhiye
- Main shot me `laid in a wide open oval loop` ki jagah:
  `laid in a soft open S-curve`
- Pehne hue shot me aadmi ki jagah aurat:

```
Close-up of a South Asian woman's neck and collarbones, cropped just below the
mouth so the face is not visible. Warm medium-brown skin, soft natural
daylight, natural skin texture.

She is wearing the thin chain from the uploaded image. Keep the link pattern
and the thinness identical — it must sit lightly on the skin, not look heavy.

Plain deep red silk blouse at the bottom of the frame. Softly blurred warm
off-white background. Portrait 4:5.
```

---

# Category 8 — Bracelet

In photos me har bracelet par **safed hallmark tag** laga hai. Usse hatana
zaroori hai, warna website par tag ke saath chhap jayega.

### 1. Main

```
This is a jewellery catalogue photo. Three thin gold bracelets lie diagonally
across black velvet, each with a white paper hallmark tag attached at one end.

USE ONLY: the [2nd] bracelet counting from the top — [the plain flat snake
chain with a single round gold bead at its centre].
IGNORE AND REMOVE: the other bracelets, every white paper tag and everything
printed on it, all barcodes and QR codes, and the photographer's watermark.
The clasp should remain, but no tag.

Study the chosen bracelet. Note the link pattern, the position and shape of any
beads or charms, and the clasp. Reproduce exactly that. Do not restyle, do not
add charms or stones.

Output: that single bracelet alone, laid in a soft open circle, centred on a
seamless warm off-white (#F4F4F2) surface. Soft diffused light from the upper
left, one soft natural shadow beneath. 22K yellow gold, warm and true to
colour, not orange, not brassy. Square 1:1, whole bracelet in frame with an
even margin, sharp throughout, e-commerce catalogue style.
```

### 2. Zoom

```
Extreme close-up macro of the centre section of the bracelet from the uploaded
image, filling the frame. Reproduce the link pattern and the bead exactly as
uploaded. Do not change the pattern, do not add charms. Warm off-white
(#F4F4F2) background out of focus. Soft diffused light. Square 1:1.
```

### 3. Pehne hue

```
Close-up of a South Asian woman's wrist and forearm resting on a warm off-white
surface, hand relaxed and slightly turned. Warm medium-brown skin, natural
unpolished nails, soft window light from the left, natural skin texture.

She is wearing the bracelet from the uploaded image. Keep the design identical
and keep it thin and delicate — do not thicken it.

Shallow depth of field, softly blurred background. Square 1:1.
```

---

# Category 9 — Shakha (safed + sona)

**Sabse zaroori baat:** ye safed shankh par sone ka kaam hai. AI ko na roka
jaye to wo poora sona bana dega. Isliye har prompt me do baar likha hai ki
safed hissa safed hi rehna chahiye.

Ye jode me bikte hain, aur photo me safed roller par chadhe hue hain — roller
hatana hai.

### 1. Main

```
This is a jewellery catalogue photo. Several pairs of white conch-shell bangles
with gold inlay are mounted on a white cylindrical roller against a black
background.

USE ONLY: the [3rd] pair from the left — [the pair with a checkerboard gold
band running around the middle].
IGNORE AND REMOVE: every other pair, the white roller they are mounted on, the
yellow thread, all printed weight and size numbers, and the photographer's
watermark.

CRITICAL: the body of these bangles is carved CREAM-WHITE CONCH SHELL, not
gold. Only the inlaid pattern is gold. Keep the white parts white and the
carved shell texture visible. Do not turn any part of the bangle into solid
gold.

Study the chosen pair. Note the carved shell pattern, and exactly where the
gold inlay sits and what shape it is. Reproduce exactly that. Do not restyle,
do not add more gold, do not add stones.

Output: that one pair standing upright side by side, seen from the front,
centred on a seamless warm off-white (#F4F4F2) surface. Soft diffused light
from the upper left, one soft natural shadow beneath each. Cream-white shell
with warm 22K gold inlay, true to colour. Square 1:1, both bangles fully in
frame with an even margin, sharp throughout, e-commerce catalogue style.
```

### 2. Zoom

```
Extreme close-up macro of the gold inlay section of one bangle from the
uploaded image, filling the frame. Show both the carved cream-white shell
texture and the gold work sitting in it. Reproduce the inlay pattern exactly as
uploaded — do not add more gold, do not change the pattern. The shell must stay
cream-white. Warm off-white (#F4F4F2) background out of focus. Soft raking
light bringing out the carving. Square 1:1.
```

### 3. Pehne hue

```
Close-up of a South Asian woman's forearms and wrists crossed in front of her,
cropped at the elbows, no face visible. Warm medium-brown skin, soft mehendi
pattern on the backs of the hands, soft natural daylight, natural skin texture.

She is wearing the pair of bangles from the uploaded image, one on each wrist.
Keep the design identical — the body stays carved cream-white conch shell, only
the inlaid pattern is gold. Do not turn them into gold bangles.

She wears a deep red silk saree with a gold zari border at the edge of frame.
Softly blurred warm off-white background. Editorial bridal jewellery
photography. Portrait 4:5.
```

---

## Ginti kijiye — aage badhne se pehle

Pass 1 ka result asli photo ke bagal me rakh kar **ginti** kar lijiye. "Theek
lag raha hai" kaafi nahi — AI ki galti hamesha ginti me pakdi jaati hai.

- [ ] Sahi piece uthaya? (address wali pehchan milti hai?)
- [ ] Layer / strand kitne hain? (asli 3 = nayi bhi 3)
- [ ] Neeche latkan kitne hain?
- [ ] Beech ka motif wahi shakal — gol, paan, ya heart?
- [ ] Chain ya link ka pattern wahi hai?
- [ ] Koi naya patthar ya moti to nahi aa gaya?
- [ ] Shakha me safed hissa safed hi hai?
- [ ] Weight number, `750`, hallmark tag, ya watermark to nahi bacha?

Ek bhi tick chhoot jaye to result phenk dijiye aur dobara chalaiye. **Customer
yahi photo dekh kar dukaan aayega.**

Ek hi piece par teen baar drift ho to AI chhodiye — us piece ko crop karke
seedhe background hata dijiye (Preview, Photopea, ya koi cutout tool). Design
tab bilkul asli rehta hai aur paisa kuch nahi lagta.

---

## Sab photos ek jaisi dikhein

Grid tabhi premium lagta hai jab har photo ek hi jagah par khinchi lage.

- **Background har jagah wahi** — Shop row ke `brandGround` wala hex. Poddar ke
  liye abhi `#F4F4F2`.
- **Roshni ka waakya kabhi mat badliye** — `soft diffused light from the upper
  left` har prompt me wahi rehna chahiye.
- **Seed note kar lijiye.** Jo pehla acha result aaye uska seed likh lijiye aur
  baaki sab me wahi daaliye.
- **Shape ek category me ek hi** — sare jhumke khade, sare haar U-shape me,
  sari chain oval loop me.
- **Output 2000px se bada.** Site khud chhota kar legi.
- **Sona chamkaiye mat.** `warm, true to colour, not orange` hamesha rahe.

---

## File ka naam

`docs/PHOTOGRAPHY.md` wali hi convention:

```
jhumka-chandbali-01-main.jpg
jhumka-chandbali-01-zoom.jpg
jhumka-chandbali-01-worn.jpg
```

Ek product ke teeno file ka naam ek hi rakhiye, sirf aakhir wala shabd badle.
Admin me upload karte waqt dhoondhna aasan ho jaata hai.

---

## Hero aur poster

Yahan kisi asli product ka daawa nahi hai, isliye poora AI se banana theek hai.
**Shart ek hi:** hero me aisa product saaf na dikhe jo dukaan me hai hi nahi.
Blurred, abstract ya out-of-focus rakhiye.

### Hero — desktop (16:9)

```
Luxury jewellery brand hero image. A warm off-white (#F4F4F2) linen surface
lit by soft morning window light, deep antique-gold (#8F621A) tones in the
shadows. In the lower right third, a softly out-of-focus arrangement of
traditional Indian 22K gold jewellery — out of focus enough that no single
design reads clearly. Large clean empty space on the left for text.
Minimal, calm, expensive. Subtle film grain, no vignette, no text.
Cinematic 16:9, high resolution.
```

### Hero — mobile (4:5)

Alag banwaiye. Desktop wale ko crop karenge to text ki jagah kat jayegi.

```
Vertical luxury jewellery hero image. Warm off-white (#F4F4F2) textured
background, soft daylight. A single antique-gold thread of jewellery curving
in from the bottom edge, deliberately out of focus. Upper two-thirds almost
empty for text overlay. Minimal, warm, premium. No text, no logo. 4:5 portrait.
```

### Category tiles (3:4)

Har category ke liye **bilkul yahi prompt**, sirf `[ ]` wala shabd badliye.

```
Minimal category tile for a jewellery catalogue. One traditional Indian 22K
gold [EARRING / NECKLACE / BANGLE / PENDANT / CHAIN] resting on a warm
off-white (#F4F4F2) stone surface, slightly right of centre. Soft diffused
light from the upper left, one long soft shadow. Muted, understated, lots of
negative space. Top-down flat lay. No text, no props, no hands. Portrait 3:4.
```

### Festival poster background (4:5)

**Text AI se mat likhwaiye.** AI Devanagari aur angrezi dono bigaadta hai.
Background AI se banwaiye, text baad me site ke fonts (Instrument Serif +
Karla) me upar lagaiye — tabhi poster website se match karega.

```
Festive background plate for a jewellery shop poster. Deep warm gold (#8F621A)
to near-black (#1A1D1B) gradient, soft diffused bokeh of diya flames in the
far background, delicate hand-drawn marigold and paisley border framing the
edges with a large clean empty centre. Elegant, restrained, not gaudy.
No text, no letters, no logo, no people. Portrait 4:5.
```

| Mauka | Kya badlein |
|---|---|
| Diwali | diya + genda phool |
| Dhanteras | wahi, thoda zyada gold |
| Karwa Chauth | chaand aur chhalni ki jaali |
| Shaadi season | laal silk texture + gold zari border |

### Trust strip / about section (16:9)

```
Warm documentary photograph of a traditional Indian goldsmith's hands at work
at a wooden bench — fine tools, a small flame, gold filings. Hands only, no
face. Soft natural light from a window, warm tones, shallow depth of field,
authentic and unstaged. Not a stock-photo look. 16:9.
```

---

## Negative prompt — har product photo ke saath

```
watermark, text, numbers, price tags, hallmark tags, barcodes, logo, signature,
black background, white roller, second piece, extra jewellery, duplicate
pieces, added gemstones, redesigned pattern, extra granulation, plastic look,
HDR glow, harsh flash, props, clutter
```

Shakha ke liye isme ye bhi jod dijiye: `solid gold bangle, gold body`

---

## Nahi karna hai

- Pass 2 me tray wali photo dobara dena — hamesha Pass 1 ka saaf output dijiye
- Address block ke bina prompt chalana — AI do product mila dega
- Address me sirf ginti, ya sirf pehchan likhna — dono chahiye
- Weight ka number ya `750` pehchan ke liye likhna — wo image me chhap jaayega
- Bina ginti kiye main shot use kar lena
- Shakha ko poora sona bana dena
- Hallmark tag ya roller frame me chhod dena
- AI se poster par text likhwana
- Hero me koi saaf dikhne wala product jo dukaan me nahi hai
- Doosre photographer ka watermark chhod dena — crop kariye, aur agar photos
  unhi se banwaye hain to permission le lijiye

---

## Doosri dukaan ke liye

Is guide me sirf teen cheezein dukaan-specific hain: `brandGround` ka hex
(background), `brandPrimary` ka hex (poster gradient), aur fonts. Teeno Shop
row par hain. Naye customer ke liye bas inhe badal dijiye — prompts, address
system aur ginti wali list wahi rahengi.
