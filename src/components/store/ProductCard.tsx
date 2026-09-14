import Link from 'next/link';
import Image from 'next/image';
import { Product, ProductImage } from '@prisma/client';
import { Card } from '@/components/ui/Surface';
import { formatINR } from '@/lib/money';

export function getPriceRangeLabel(minPaise: number | null, maxPaise: number | null): string {
  if (!minPaise) return 'Price on request';
  if (!maxPaise || minPaise === maxPaise) {
    return `${formatINR(minPaise)} (approx)`;
  }
  return `${formatINR(minPaise)} – ${formatINR(maxPaise)}`;
}

type ProductWithImages = Product & { images: ProductImage[] };

function getImageUrl(image: ProductImage): string {
  const customPath = (image as unknown as { path?: string }).path;
  if (customPath) return customPath;
  if (image.basePath.startsWith('/') || image.basePath.startsWith('http')) {
    return image.basePath;
  }
  return `/uploads/${image.basePath}-800.webp`;
}

export function ProductCard({ product }: { product: ProductWithImages }) {
  const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];
  const priceLabel = getPriceRangeLabel(product.cachedPriceMinPaise, product.cachedPriceMaxPaise);
  const imgSrc = primaryImg ? getImageUrl(primaryImg) : null;

  return (
    <Card className="overflow-hidden group flex flex-col h-full">
      <Link href={`/p/${product.slug}`} className="block relative aspect-square bg-surface-sunk">
        {imgSrc && primaryImg ? (
          <Image
            src={imgSrc}
            alt={primaryImg.alt || product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-sm">
            No Image
          </div>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-display text-lg text-ink font-medium leading-tight">
            <Link href={`/p/${product.slug}`} className="hover:text-brand transition-colors">
              {product.name}
            </Link>
          </h3>
        </div>
        <div className="mt-3 pt-3 border-t border-line">
          <p className="text-sm font-semibold text-ink numeric">
            {priceLabel}
          </p>
          <p className="text-xs text-ink-faint mt-0.5">Aaj ke rate par anumaanit</p>
        </div>
      </div>
    </Card>
  );
}
