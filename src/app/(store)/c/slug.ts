export function parseSlugArray(slug: string[]): string {
  if (!slug || slug.length === 0) return '';
  return slug[slug.length - 1];
}
