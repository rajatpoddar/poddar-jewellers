/**
 * Joins class names, dropping anything falsy.
 *
 * Deliberately not `clsx`: the whole need is one line, and a dependency in the
 * render path of every component is a thing to keep patched forever.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
