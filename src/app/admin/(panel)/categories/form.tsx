'use client';

import { useActionState } from 'react';
import { createCategory, type CategoryState } from './actions';

export function NewCategoryForm({
  parents,
  defaultPercent,
}: {
  parents: Array<{ id: string; name: string }>;
  defaultPercent: number;
}) {
  const [state, action, pending] = useActionState<CategoryState, FormData>(createCategory, {});

  return (
    <form action={action} className="bg-white border border-stone-200 rounded p-5 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Nayi category</span>
          <input name="name" required className="border border-stone-300 rounded px-3 py-2" />
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Parent</span>
          <select name="parentId" className="border border-stone-300 rounded px-3 py-2">
            <option value="">— top level —</option>
            {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Making %</span>
          <input name="makingPercent" inputMode="decimal" placeholder={String(defaultPercent)}
            className="w-24 border border-stone-300 rounded px-3 py-2 tabular-nums" />
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
