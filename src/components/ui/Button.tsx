import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cx } from './cx';

/**
 * The only button in the product.
 *
 * `intent` is what the button means, never what it looks like — a screen asks
 * for `danger` because the action destroys something, and the design system
 * decides that danger is red. That is what stops a future screen inventing a
 * seventh shade of brown.
 */
export type ButtonIntent = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ButtonSize = 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-field font-medium ' +
  'cursor-pointer select-none whitespace-nowrap ' +
  'transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

/** Every size clears the 44px minimum touch target. */
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 text-[0.9375rem]',
  lg: 'min-h-13 px-8 text-base',
};

const INTENTS: Record<ButtonIntent, string> = {
  primary: 'bg-brand text-brand-on hover:bg-brand-strong',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-sunk',
  quiet: 'bg-transparent text-ink-muted hover:bg-surface-sunk hover:text-ink',
  // Red is always visible, so the signal never depends on hover — a phone
  // has none. Only the box waits, so six delete buttons down a list do not
  // shout over the rows they belong to.
  danger: 'bg-transparent text-danger border border-transparent hover:border-danger-line hover:bg-danger-soft',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: ButtonIntent;
  size?: ButtonSize;
  /** Stretches to the container on phones and shrinks to content from `sm` up. */
  block?: boolean;
}

export function Button({
  intent = 'primary',
  size = 'md',
  block = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(BASE, SIZES[size], INTENTS[intent], block && 'w-full sm:w-auto', className)}
    />
  );
}

/** A link that has to read as a button — "Naya product", "Wapas". */
export function ButtonLink({
  href,
  intent = 'primary',
  size = 'md',
  className,
  children,
}: {
  href: string;
  intent?: ButtonIntent;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(BASE, SIZES[size], INTENTS[intent], className)}>
      {children}
    </Link>
  );
}
