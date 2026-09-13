'use client';

import { useActionState } from 'react';
import { saveProduct, type SaveProductState } from '@/app/admin/(panel)/products/actions';

export interface ProductFormData {
  id: string | null;
  name: string;
  description: string;
  categoryId: string;
  metalTypeId: string;
  status: string;
  featured: boolean;
  stoneValueRupees: number;
  stoneDescription: string;
  makingPercent: string;
  weightsGrams: string;
  attributeIds: string[];
}

export interface ProductFormOptions {
  categories: Array<{ id: string; name: string }>;
  metalTypes: Array<{ id: string; label: string }>;
  attributeGroups: Array<{ id: string; name: string; attributes: Array<{ id: string; name: string }> }>;
  /** What the making charge resolves to if this product's own override is blank. */
  inheritedMakingLabel: string;
}

const field = 'w-full border border-stone-300 rounded px-3 py-2.5';

export function ProductForm({
  product,
  options,
}: {
  product: ProductFormData;
  options: ProductFormOptions;
}) {
  const bound = saveProduct.bind(null, product.id);
  const [state, formAction, pending] = useActionState<SaveProductState, FormData>(bound, {});

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Product ka naam</span>
        <input name="name" required defaultValue={product.name} className={field} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Description</span>
        <textarea name="description" rows={3} defaultValue={product.description} className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Category</span>
          <select name="categoryId" required defaultValue={product.categoryId} className={field}>
            <option value="">— chuniye —</option>
            {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Metal type</span>
          <select name="metalTypeId" required defaultValue={product.metalTypeId} className={field}>
            <option value="">— chuniye —</option>
            {options.metalTypes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <span className="block text-xs text-stone-500">
            Isi ka daily rate is product ka price banata hai.
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Status</span>
          <select name="status" defaultValue={product.status} className={field}>
            <option value="DRAFT">Draft — website par nahi dikhega</option>
            <option value="LIVE">Live — website par dikhega</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Available weights (gram)</span>
        <input name="weights" required defaultValue={product.weightsGrams} placeholder="20, 23, 25" className={field} />
        <span className="block text-xs text-stone-500">
          Comma se alag kariye. Heere wale product me sirf metal ka weight likhiye, heere ka nahi.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Making charge %</span>
        <input name="makingPercent" inputMode="decimal" defaultValue={product.makingPercent} className={field} />
        <span className="block text-xs text-stone-500">
          Khaali chhodiye to <strong>{options.inheritedMakingLabel}</strong> lagega.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Heere / patthar ki keemat (₹)</span>
          <input name="stoneValue" inputMode="decimal" defaultValue={product.stoneValueRupees || ''} className={field} />
          <span className="block text-xs text-stone-500">Ye weight ke saath nahi badalta.</span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Heere ka vivaran</span>
          <input name="stoneDescription" defaultValue={product.stoneDescription} placeholder="0.50ct" className={field} />
        </label>
      </div>

      {options.attributeGroups.map((group) => (
        <fieldset key={group.id} className="space-y-2">
          <legend className="text-sm text-stone-600">{group.name}</legend>
          <div className="flex flex-wrap gap-3">
            {group.attributes.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="attributeIds" value={a.id}
                  defaultChecked={product.attributeIds.includes(a.id)} />
                {a.name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Photos</span>
        <input type="file" name="images" accept="image/*" multiple className={field} />
        <span className="block text-xs text-stone-500">Purani photos hategi nahi, nayi jud jayengi.</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={product.featured} />
        Home page par dikhaiye
      </label>

      {state.error && <p className="text-red-700">{state.error}</p>}

      <button type="submit" disabled={pending}
        className="bg-stone-900 text-white rounded px-8 py-3 text-base disabled:opacity-60">
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </button>
    </form>
  );
}
