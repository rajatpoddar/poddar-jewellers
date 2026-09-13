import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';

/**
 * Labels are always visible and always above the control.
 *
 * A placeholder-as-label disappears the moment someone types, which is exactly
 * when a non-technical user looks up to check what they are filling in. Hint
 * text sits below the control, error text below that and in red — near the
 * field, never collected in a summary at the top of the page.
 */

const CONTROL =
  'min-h-11 rounded-field border border-line-strong bg-surface px-3 py-2.5 ' +
  'text-base text-ink placeholder:text-ink-faint ' +
  'transition-colors ' +
  'hover:border-brand-line disabled:bg-surface-sunk disabled:text-ink-faint';

const INVALID = 'border-danger-line bg-danger-soft';

/**
 * Width is a prop, not a class you pass in.
 *
 * A control that hardcodes `w-full` cannot be narrowed from the outside: both
 * `w-full` and `w-20` are single-class selectors, so which one wins is decided
 * by Tailwind's output order, not by the caller. A percentage box came out
 * 200px wide that way. `width="auto"` yields to whatever the caller sets.
 */
export type ControlWidth = 'full' | 'auto';

const WIDTH: Record<ControlWidth, string> = { full: 'w-full', auto: '' };

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-ink-faint">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  invalid,
  numeric,
  width = 'full',
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  numeric?: boolean;
  width?: ControlWidth;
}) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, WIDTH[width], numeric && 'numeric', invalid && INVALID, className)}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, 'w-full py-3 leading-relaxed', invalid && INVALID, className)}
    />
  );
}

export function Select({
  invalid,
  width = 'full',
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; width?: ControlWidth }) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, WIDTH[width], 'cursor-pointer pr-8', invalid && INVALID, className)}
    />
  );
}

/** A checkbox and its label, sized so the whole row is the target. */
export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label
      className={cx(
        'inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem] text-ink',
        className,
      )}
    >
      <input
        type="checkbox"
        {...props}
        className="size-4.5 cursor-pointer accent-[var(--color-brand)]"
      />
      {label}
    </label>
  );
}
