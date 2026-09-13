'use client';

import { useActionState } from 'react';
import { createMetalType, type MetalState } from './actions';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { CardFieldset } from '@/components/ui/Surface';
import { PlusIcon } from '@/components/ui/icons';

export function NewMetalForm() {
  const [state, action, pending] = useActionState<MetalState, FormData>(createMetalType, {});

  return (
    <form action={action}>
      <CardFieldset title="Naya metal type">
        <div className="flex flex-wrap items-start gap-4">
          <Field label="Key" htmlFor="new-metal-key" hint="Baad me badla nahi ja sakta">
            <Input id="new-metal-key" name="key" required placeholder="SILVER_925" className="font-mono" />
          </Field>

          <Field label="Label" htmlFor="new-metal-label" hint="Ye naam screen par dikhega">
            <Input id="new-metal-label" name="label" required placeholder="Silver 925" />
          </Field>

          <Button type="submit" disabled={pending} className="mt-6.5">
            <PlusIcon />
            {pending ? 'Add ho raha hai…' : 'Add'}
          </Button>
        </div>

        {state.error && <Notice tone="danger">{state.error}</Notice>}
      </CardFieldset>
    </form>
  );
}
