# Admin Guide — Poddar Jewellers

*Dukaan chalane wale ke liye. Koi technical jankari ki zarurat nahi.*

Website kholne ke liye: **`/admin`** — jaise `poddarjewellers.in/admin`.
Apna username aur password daal kar Login dabaiye.

---

## Roz ka kaam — sirf 30 second

Login karte hi jo pehla screen khulta hai, wahi roz ka kaam hai: **Aaj ka Rate**.

1. Har metal ke saamne aaj ka rate **per gram** bhariye
2. **Save karein** dabaiye

Bas. Itna hi. Save dabate hi website ke **saare product ke price apne aap badal
jaate hain** — 50 product hon ya 500, aapko ek-ek karke kuch nahi karna.

### Neeche "Kal: ₹12,400" kyun likha hai?

Taaki aapko dikhe ki kal kya rate tha aur aaj kitna farak hai. Agar farak bahut
zyada ho to wo **laal-peela** ho jaata hai — matlab ek baar dobara dekh lijiye.

### Ek dialog aaya "Ye bada badlaav hai" — kya karun?

Ye tab aata hai jab koi rate **10% se zyada** upar-neeche ho raha ho.

Zyadatar ye typo hoti hai — jaise `12400` ki jagah galti se `124000` type ho
gaya. Dialog aapko dikhata hai ki kya se kya ho raha hai.

- Rate sach me itna badla hai → **OK** dabaiye
- Galti se type ho gaya → **Cancel** dabaiye aur theek kar lijiye

**Ye aapki suraksha hai.** Agar galat rate save ho gaya to customer ko galat
price dikhega. Isliye ek baar aur poochha jaata hai.

### "Rate purana hai" ka peela banner dikh raha hai

Matlab ek din se zyada ho gaya rate update kiye hue. Bas aaj ka rate daal kar
Save dabaiye, banner chala jayega.

Do din se zyada ho jaye to **customer ki website par bhi** ek line dikhne lagti
hai ki rate confirm karne ke liye call kariye. Isliye roz update karna behtar
hai.

---

## Naya product daalna

**Products** → **Naya product**

| Kya bharna hai | Kaise |
|---|---|
| **Naam** | Jaise "Traditional Payal" |
| **Category** | Payal, Ring, Necklace... |
| **Metal type** | Gold 22K, Silver 999... — *isi ka rate is product ka price banata hai* |
| **Available weights** | Jitne gram me ye design banta hai: `20, 23, 25` — comma se alag |
| **Making charge %** | **Khaali chhod dijiye** — default apne aap lag jayega |
| **Photos** | Ek saath kai chun sakte hain |
| **Status** | Draft = website par nahi dikhega · Live = dikhega |

### Weights sabse zaroori hai

Customer website par **weight chunta hai**, aur price turant badal jaata hai.
Isliye jitne gram me aap wo design bana sakte ho, sab yahan likh dijiye.

Sirf wahi weight likhiye **jo aap sach me bana sakte ho** — customer usi me se
chunega.

### Heere wale product

- **Available weights** me sirf **sone ka weight** likhiye, heere ka nahi
- **Heere ki keemat** alag box me — kyunki heera rate ke saath nahi badalta,
  sona badalta hai
- **Heere ka vivaran** me `0.50ct` jaisa kuch

### Making charge khaali chhodne ka matlab

Neeche chhota sa likha rehta hai, jaise **"15% (dukaan ke default se)"** ya
**"12% (Payal category se)"** — yaani agar aap khaali chhodoge to kitna lagega
aur wo kahan se aa raha hai.

Sirf tab bhariye jab **is ek product** ka making charge alag ho.

---

## Kabhi-kabhi ka kaam

### Category ka making charge

**Categories** → kisi bhi category ke saamne `% making` me number daal kar Save.

Jaise Payal ka 12% kar diya, to **saare payal** 12% par aa jayenge — ek-ek
product kholne ki zarurat nahi. Khaali chhod denge to dukaan ka default lagega.

### Naya metal ya purity

**Metal types** → Key aur Label bhar kar Add.

Jaise aapne `SILVER_925` / `Silver 925` add kiya — ab **Aaj ka Rate** screen par
uska box apne aap aa jayega. Kuch aur nahi karna.

> **Key baad me badli nahi ja sakti** (jaise `SILVER_925`), isliye ek baar soch
> kar likhiye. Label (`Silver 925`) kabhi bhi badal sakte hain.

Koi metal band karna ho to **Band karein** — mitata nahi hai, sirf chhupata hai,
taaki purana rate record surakshit rahe. Agar us metal par product hain to pehle
unhe badalna padega.

### Dukaan ki jankari

**Settings** me sab kuch hai — naam, pata, phone, WhatsApp, email, website ke
rang aur font, default making charge, GST, aur wo line jo price ke neeche dikhti
hai.

**Yahan kuch bhi badal sakte hain, kisi ki madad ki zarurat nahi.**

> Making charge, GST ya rounding badalne par **poora catalog turant dobara
> calculate ho jaata hai.** Ek number galat daala to sab jagah dikhega — dhyan
> se.

---

## Yaad rakhne wali baatein

**Customer ko sirf ek number dikhta hai.** Metal kitna, making kitna, GST kitna
— ye kuch nahi dikhta. Sirf `₹3,37,900` aur neeche chhota sa *"Aaj ke rate par
anumaanit, sab tax shaamil."*

**Price hamesha thoda upar round hota hai.** ₹3,17,240 ka estimate ₹3,17,300
dikhega. Soch ye hai ki jo number customer ne screen par dekha, wo dukaan par
aakar kam na pade.

**Draft matlab safe.** Product par kaam adhoora hai? Status **Draft** rakhiye —
website par nahi dikhega. Photo aur weight theek hone par **Live** kar dijiye.

**Photo hatti nahi hai.** Product edit karke Save dabane par purani photos
rehti hain, nayi jud jaati hain.

---

## Kuch gadbad lage to

| Dikh raha hai | Matlab |
|---|---|
| "Rate purana hai" peela banner | Aaj ka rate daal dijiye |
| Product par "aaj ka rate nahi hai" | Us product ke metal type ka rate aaj nahi bhara gaya |
| "Is category me 3 product hain" | Category hatane se pehle uske product doosri category me daaliye |
| "Username ya password galat hai" | Dobara dhyan se type kariye |
| Kuch bhi aur | Rajat ko phone kariye — kuch bigda nahi hai, sab wapas aa sakta hai |

**Dar ke kuch mat chhodiye.** Rate ka har record rakha jaata hai, aur galat rate
save ho jaye to bas sahi rate dobara daal dijiye — website turant theek ho
jayegi.
