'use client';

import { useActionState, useState } from 'react';
import { saveRate, type SaveRateState } from '@/app/admin/(panel)/actions';
import { significantMoves } from '@/lib/rates';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { cx } from '@/components/ui/cx';

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
          <label
            key={f.metalTypeId}
            className={cx(
              'block cursor-text rounded-card border bg-surface p-5 shadow-card transition-colors',
              // A big move tints the whole card, not just its caption — the
              // warning has to be visible while the eye is on the number.
              f.isBig ? 'border-warn-line bg-warn-soft' : 'border-line focus-within:border-brand',
            )}
          >
            <span className="block text-[0.9375rem] font-medium text-ink">{f.label}</span>

            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-display text-2xl text-ink-faint">₹</span>
              <input
                name={`rate_${f.metalTypeId}`}
                inputMode="decimal"
                required
                value={values[f.metalTypeId]}
                onChange={(e) => setValues((v) => ({ ...v, [f.metalTypeId]: e.target.value }))}
                size={7}
                // Borderless on purpose: the card is the field — the whole
                // <label> is the click target, so the input does not have to
                // stretch. It grows with its digits instead, which keeps
                // "/ gram" beside the number rather than at the card's edge.
                className="numeric min-w-0 bg-transparent text-3xl font-medium text-ink outline-none field-sizing-content"
              />
              <span className="whitespace-nowrap text-sm text-ink-faint">/ gram</span>
            </div>

            <span
              className={cx(
                'mt-2 block text-sm',
                f.isBig ? 'font-medium text-warn' : 'text-ink-faint',
              )}
            >
              {f.previousRupees > 0
                ? `Kal: ₹${f.previousRupees.toLocaleString('en-IN')}${f.pct !== 0 ? ` · ${f.pct > 0 ? '+' : ''}${f.pct.toFixed(1)}%` : ''}`
                : 'Pehli baar'}
            </span>
          </label>
        ))}
      </div>

      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.savedAt && (
        <Notice tone="good" title="Rate save ho gaya.">
          Poori website update ho gayi.
        </Notice>
      )}

      <Button type="submit" size="lg" disabled={pending} block>
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </Button>
    </form>
  );
}
