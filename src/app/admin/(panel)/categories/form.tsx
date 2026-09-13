'use client';

import { useActionState } from 'react';
import { createCategory, type CategoryState } from './actions';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { CardFieldset } from '@/components/ui/Surface';
import { PlusIcon } from '@/components/ui/icons';

export function NewCategoryForm({
  parents,
  defaultPercent,
}: {
  parents: Array<{ id: string; name: string }>;
  defaultPercent: number;
}) {
  const [state, action, pending] = useActionState<CategoryState, FormData>(createCategory, {});

  return (
    <form action={action}>
      <CardFieldset title="Nayi category">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Naam" htmlFor="new-category-name" className="min-w-45 flex-1">
            <Input id="new-category-name" name="name" required />
          </Field>

          <Field label="Parent" htmlFor="new-category-parent">
            <Select id="new-category-parent" name="parentId">
              <option value="">— top level —</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Making %" htmlFor="new-category-making">
            <Input
              id="new-category-making"
              name="makingPercent"
              inputMode="decimal"
              numeric
              placeholder={String(defaultPercent)}
              width="auto"
              className="w-24"
            />
          </Field>

          <Button type="submit" disabled={pending}>
            <PlusIcon />
            {pending ? 'Add ho raha hai…' : 'Add'}
          </Button>
        </div>

        {state.error && <Notice tone="danger">{state.error}</Notice>}
      </CardFieldset>
    </form>
  );
}
