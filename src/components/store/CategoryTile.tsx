import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@prisma/client';
import { Card } from '@/components/ui/Surface';

export function CategoryTile({
  category,
  imageUrl,
}: {
  category: Category;
  imageUrl?: string;
}) {
  const description = (category as unknown as { description?: string }).description;

  return (
    <Link href={`/c/${category.slug}`} className="block group h-full">
      <Card className="overflow-hidden border border-line group-hover:border-brand transition-all duration-500 bg-surface h-full flex flex-col justify-between">
        {imageUrl ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunk">
            <Image
              src={imageUrl}
              alt={category.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ground/80 via-transparent to-transparent" />
          </div>
        ) : null}

        <div className="p-5 flex flex-col flex-1 justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest text-brand font-semibold block">Collection</span>
            <h3 className="font-display text-2xl text-ink font-bold group-hover:text-brand transition-colors">
              {category.name}
            </h3>
            {description && (
              <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">{description}</p>
            )}
          </div>
          <div className="pt-2 text-xs font-semibold text-ink-muted group-hover:text-ink transition-colors flex items-center justify-between border-t border-line">
            <span>Browse Designs</span>
            <span>→</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
