'use client';

import { useActionState } from 'react';
import { saveProduct, type SaveProductState } from '@/app/admin/(panel)/products/actions';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { CardFieldset } from '@/components/ui/Surface';

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

/**
 * Grouped into four sections so the form is read in the order the shop thinks:
 * what the item is, what it weighs, what it costs on top of metal, and how it
 * appears on the website. Progressive disclosure — one long ungrouped column
 * of eleven inputs is the version a non-technical user abandons.
 */
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
    <form action={formAction} className="max-w-2xl space-y-6">
      <CardFieldset title="Item">
        <Field label="Product ka naam" htmlFor="name">
          <Input id="name" name="name" required defaultValue={product.name} />
        </Field>

        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" rows={3} defaultValue={product.description} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" htmlFor="categoryId">
            <Select id="categoryId" name="categoryId" required defaultValue={product.categoryId}>
              <option value="">— chuniye —</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Metal type"
            htmlFor="metalTypeId"
            hint="Isi ka daily rate is product ka price banata hai."
          >
            <Select id="metalTypeId" name="metalTypeId" required defaultValue={product.metalTypeId}>
              <option value="">— chuniye —</option>
              {options.metalTypes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {options.attributeGroups.map((group) => (
          <fieldset key={group.id}>
            <legend className="text-sm font-medium text-ink-muted">{group.name}</legend>
            <div className="mt-0.5 flex flex-wrap gap-x-5">
              {group.attributes.map((a) => (
                <Checkbox
                  key={a.id}
                  name="attributeIds"
                  value={a.id}
                  defaultChecked={product.attributeIds.includes(a.id)}
                  label={a.name}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </CardFieldset>

      <CardFieldset title="Weight">
        <Field
          label="Available weights (gram)"
          htmlFor="weights"
          hint="Comma se alag kariye. Heere wale product me sirf metal ka weight likhiye, heere ka nahi."
        >
          <Input
            id="weights"
            name="weights"
            required
            numeric
            defaultValue={product.weightsGrams}
            placeholder="20, 23, 25"
          />
        </Field>
      </CardFieldset>

      <CardFieldset title="Metal ke upar ka kharcha">
        <Field
          label="Making charge %"
          htmlFor="makingPercent"
          hint={
            <>
              Khaali chhodiye to <strong>{options.inheritedMakingLabel}</strong> lagega.
            </>
          }
        >
          <Input
            id="makingPercent"
            name="makingPercent"
            inputMode="decimal"
            numeric
            defaultValue={product.makingPercent}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Heere / patthar ki keemat (₹)"
            htmlFor="stoneValue"
            hint="Ye weight ke saath nahi badalta."
          >
            <Input
              id="stoneValue"
              name="stoneValue"
              inputMode="decimal"
              numeric
              defaultValue={product.stoneValueRupees || ''}
            />
          </Field>

          <Field label="Heere ka vivaran" htmlFor="stoneDescription">
            <Input
              id="stoneDescription"
              name="stoneDescription"
              defaultValue={product.stoneDescription}
              placeholder="0.50ct"
            />
          </Field>
        </div>
      </CardFieldset>

      <CardFieldset title="Website par">
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={product.status}>
            <option value="DRAFT">Draft — website par nahi dikhega</option>
            <option value="LIVE">Live — website par dikhega</option>
          </Select>
        </Field>

        <Field
          label="Photos"
          htmlFor="images"
          hint="Purani photos hategi nahi, nayi jud jayengi."
        >
          <Input
            id="images"
            name="images"
            type="file"
            accept="image/*"
            multiple
            className="py-2.5 file:mr-3 file:rounded-field file:border-0 file:bg-surface-sunk file:px-3 file:py-1.5 file:text-sm file:text-ink-muted"
          />
        </Field>

        <Checkbox name="featured" defaultChecked={product.featured} label="Home page par dikhaiye" />
      </CardFieldset>

      {state.error && <Notice tone="danger">{state.error}</Notice>}

      <Button type="submit" size="lg" disabled={pending} block>
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </Button>
    </form>
  );
}
