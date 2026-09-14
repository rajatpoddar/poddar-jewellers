import Link from 'next/link';
import { Category } from '@prisma/client';
import { Card } from '@/components/ui/Surface';

export function CategoryTile({ category }: { category: Category }) {
  const description = (category as unknown as { description?: string }).description;

  return (
    <Link href={`/c/${category.slug}`}>
      <Card className="p-6 text-center hover:border-line-strong transition-colors">
        <h3 className="font-display text-xl text-ink font-medium">{category.name}</h3>
        {description && (
          <p className="text-xs text-ink-muted mt-1">{description}</p>
        )}
      </Card>
    </Link>
  );
}
