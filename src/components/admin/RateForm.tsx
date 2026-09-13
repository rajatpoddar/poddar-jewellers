'use client';

import { useActionState, useState } from 'react';
import { saveRate, type SaveRateState } from '@/app/admin/(panel)/actions';
import { significantMoves } from '@/lib/rates';

export interface RateField {
  metalTypeId: string;
  label: string;
  /** Rupees per gram at the last save. 0 when this metal has no rate yet. */
  previousRupees: number;
}

/** A single rate moving more than this much needs a second confirmation. */
const BIG_CHANGE_PERCENT = 10;

export function RateForm({ fields }: { fields: RateField[] }) {
  const [state, action, pending] = useActionState<SaveRateState, FormData>(saveRate, {});
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      fields.map((f) => [f.metalTypeId, f.previousRupees ? String(f.previousRupees) : '']),
    ),
  );

  const entries = fields.map((f) => ({
    label: f.label,
    previousRupees: f.previousRupees,
    nextRupees: Number(values[f.metalTypeId]),
  }));

  // The threshold logic is a tested pure function in lib/rates — the dialog it
  // drives cannot be exercised by an automated browser without blocking it.
  const big = significantMoves(entries, BIG_CHANGE_PERCENT);
  const bigByLabel = new Map(big.map((m) => [m.label, m]));

  function confirmBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (big.length === 0) return;
    const lines = big.map(
      (m) =>
        `${m.label}: ₹${m.previousRupees.toLocaleString('en-IN')} → ₹${m.nextRupees.toLocaleString('en-IN')} (${m.percentChange > 0 ? '+' : ''}${m.percentChange.toFixed(1)}%)`,
    );
    // A confirm() dialog is deliberate here: it is the last stop before a typo
    // reaches every price on the website.
    if (!window.confirm(`Ye bada badlaav hai:\n\n${lines.join('\n')}\n\nSahi hai?`)) {
      event.preventDefault();
    }
  }

  const changes = fields.map((f) => {
    const next = Number(values[f.metalTypeId]);
    const move = bigByLabel.get(f.label);
    const pct =
      f.previousRupees > 0 && Number.isFinite(next) && next > 0
        ? ((next - f.previousRupees) / f.previousRupees) * 100
        : 0;
    return { ...f, next, pct, isBig: move !== undefined };
  });

  return (
    <form action={action} onSubmit={confirmBeforeSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {changes.map((f) => (
          <label key={f.metalTypeId} className="block bg-white border border-stone-200 rounded p-5 space-y-2">
            <span className="block text-base font-medium text-stone-900">{f.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg text-stone-400">₹</span>
              <input
                name={`rate_${f.metalTypeId}`}
                inputMode="decimal"
                required
                value={values[f.metalTypeId]}
                onChange={(e) => setValues((v) => ({ ...v, [f.metalTypeId]: e.target.value }))}
                className="w-full border border-stone-300 rounded px-3 py-3 text-xl tabular-nums"
              />
              <span className="text-sm text-stone-500 whitespace-nowrap">/ gram</span>
            </div>
            <span
              className={`block text-sm ${f.isBig ? 'text-amber-700 font-medium' : 'text-stone-500'}`}
            >
              {f.previousRupees > 0
                ? `Kal: ₹${f.previousRupees.toLocaleString('en-IN')}${f.pct !== 0 ? ` · ${f.pct > 0 ? '+' : ''}${f.pct.toFixed(1)}%` : ''}`
                : 'Pehli baar'}
            </span>
          </label>
        ))}
      </div>

      {state.error && <p className="text-red-700">{state.error}</p>}
      {state.savedAt && <p className="text-green-800">Rate save ho gaya. Poori website update ho gayi.</p>}

      <button type="submit" disabled={pending}
        className="w-full sm:w-auto bg-stone-900 text-white rounded px-10 py-4 text-lg font-medium disabled:opacity-60">
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </button>
    </form>
  );
}
