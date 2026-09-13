'use client';

import { useActionState } from 'react';
import { createMetalType, type MetalState } from './actions';

export function NewMetalForm() {
  const [state, action, pending] = useActionState<MetalState, FormData>(createMetalType, {});

  return (
    <form action={action} className="bg-white border border-stone-200 rounded p-5 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Key</span>
          <input name="key" required placeholder="SILVER_925"
            className="border border-stone-300 rounded px-3 py-2 font-mono" />
          <span className="block text-xs text-stone-500">Baad me badla nahi ja sakta</span>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Label</span>
          <input name="label" required placeholder="Silver 925"
            className="border border-stone-300 rounded px-3 py-2" />
        </label>
        <button type="submit" disabled={pending}
          className="bg-stone-900 text-white rounded px-6 py-2.5 disabled:opacity-60">
          {pending ? 'Add ho raha hai…' : 'Add'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
