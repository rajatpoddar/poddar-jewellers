import type { ReactNode } from 'react';
import { cx } from './cx';
import { AlertIcon, CheckIcon, InfoIcon } from './icons';

/**
 * A message about the page as a whole — a stale rate, a failed save, a
 * confirmation. Field-level errors do not belong here; they belong under the
 * field. See Field.
 *
 * Tone is carried by an icon as well as by colour, because colour alone is not
 * a signal a colour-blind user receives.
 */
export type NoticeTone = 'info' | 'warn' | 'danger' | 'good';

const TONES: Record<NoticeTone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-brand-line bg-brand-soft text-ink', icon: <InfoIcon /> },
  warn: { box: 'border-warn-line bg-warn-soft text-warn', icon: <AlertIcon /> },
  danger: { box: 'border-danger-line bg-danger-soft text-danger', icon: <AlertIcon /> },
  good: { box: 'border-good-line bg-good-soft text-good', icon: <CheckIcon /> },
};

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { box, icon } = TONES[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('flex gap-3 rounded-card border px-4 py-3.5', box, className)}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 text-[0.9375rem] leading-relaxed">
        {title && <strong className="font-medium">{title}</strong>}
        {title && children ? ' ' : null}
        {children}
      </div>
    </div>
  );
}

/** A small state label — LIVE, DRAFT, band. */
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'good' | 'warn';
  children: ReactNode;
}) {
  const tones = {
    neutral: 'border-line-strong bg-surface-sunk text-ink-muted',
    good: 'border-good-line bg-good-soft text-good',
    warn: 'border-warn-line bg-warn-soft text-warn',
  } as const;

  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-pill border px-2.5 py-0.5',
        'text-xs font-medium uppercase tracking-wide',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
