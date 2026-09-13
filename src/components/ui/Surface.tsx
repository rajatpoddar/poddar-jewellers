import type { ReactNode } from 'react';
import { cx } from './cx';

/** A white panel on the page ground. The default container for anything grouped. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-card border border-line bg-surface shadow-card', className)}>
      {children}
    </div>
  );
}

/**
 * A fieldset that reads as a card, for long forms broken into sections.
 * `legend` is a real <legend>, so a screen reader announces the section name
 * with every control inside it.
 */
export function CardFieldset({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-card border border-line bg-surface px-6 pb-6 pt-5 shadow-card">
      <legend className="px-2 font-display text-lg text-ink">{title}</legend>
      {hint && <p className="mb-5 mt-1 text-sm text-ink-muted">{hint}</p>}
      <div className={cx('space-y-5', !hint && 'mt-4')}>{children}</div>
    </fieldset>
  );
}

/** A list of records: hairline-separated rows inside one card. */
export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cx('divide-y divide-line overflow-hidden', className)}>{children}</Card>
  );
}

/** What a list says when the shop has not added anything yet. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{children}</div>}
    </div>
  );
}

/**
 * The heading block every admin screen opens with: what this screen is, one
 * sentence on what it does, and the screen's primary action on the right.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </div>
  );
}
