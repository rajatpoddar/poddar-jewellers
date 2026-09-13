import type { MakingResolution } from './pricing/making';

/**
 * How an effective making charge is described in the admin.
 *
 * Shared so the "new product" and "edit product" screens word it identically —
 * this admin is going to a non-technical user, and two phrasings for the same
 * fact read as two different facts.
 */
export function makingSourceLabel(resolution: MakingResolution): string {
  const percent = resolution.percentBp / 100;

  switch (resolution.source.kind) {
    case 'product':
      return `${percent}% (is product ka apna)`;
    case 'category':
      return `${percent}% (${resolution.source.categoryName} category se)`;
    case 'default':
      return `${percent}% (dukaan ke default se)`;
  }
}
