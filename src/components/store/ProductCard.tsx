import Link from 'next/link';
import Image from 'next/image';
import { Product, ProductImage, Category } from '@prisma/client';
import { Card } from '@/components/ui/Surface';
import { formatINR } from '@/lib/money';
import { ButtonLink } from '@/components/ui/Button';

export function getPriceRangeLabel(minPaise: number | null, maxPaise: number | null): string {
  if (!minPaise) return 'Price on request';
  if (!maxPaise || minPaise === maxPaise) {
    return `${formatINR(minPaise)} (approx)`;
  }
  return `${formatINR(minPaise)} – ${formatINR(maxPaise)}`;
}

type ProductWithDetails = Product & {
  images: ProductImage[];
  category?: Category | null;
};

function getImageUrl(image: ProductImage): string {
  const customPath = (image as unknown as { path?: string }).path;
  if (customPath) return customPath;
  if (image.basePath.startsWith('/') || image.basePath.startsWith('http')) {
    return image.basePath;
  }
  return `/uploads/${image.basePath}-800.webp`;
}

function getFallbackImage(slug?: string): string | null {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  if (lower.includes('choker')) return '/images/cat-chokers.png';
  if (lower.includes('necklace') || lower.includes('haar')) return '/images/cat-necklaces.png';
  if (lower.includes('earring') || lower.includes('jhumka') || lower.includes('top') || lower.includes('bali')) return '/images/cat-earrings.png';
  if (lower.includes('bangle') || lower.includes('kangan') || lower.includes('kada')) return '/images/cat-bangles.png';
  if (lower.includes('bridal') || lower.includes('set')) return '/images/cat-bridal.png';
  if (lower.includes('ring') || lower.includes('angoothi')) return '/images/cat-rings.png';
  if (lower.includes('payal') || lower.includes('anklet')) return '/images/cat-payal.png';
  if (lower.includes('mangalsutra') || lower.includes('tanmaniya')) return '/images/cat-mangalsutra.png';
  if (lower.includes('pendant') || lower.includes('locket')) return '/images/cat-pendants.png';
  if (lower.includes('chain')) return '/images/cat-chains.png';
  if (lower.includes('coin')) return '/images/cat-coins.png';
  return null;
}

export function ProductCard({ product }: { product: ProductWithDetails }) {
  const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];
  const priceLabel = getPriceRangeLabel(product.cachedPriceMinPaise, product.cachedPriceMaxPaise);
  const imgSrc = primaryImg ? getImageUrl(primaryImg) : getFallbackImage(product.category?.slug);

  return (
    <Card className="overflow-hidden group flex flex-col h-full border border-line hover:border-line-strong transition-all duration-300">
      <Link href={`/p/${product.slug}`} className="block relative aspect-square bg-surface-sunk overflow-hidden">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={primaryImg?.alt || product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-sm">
            No Image
          </div>
        )}
        {product.category && (
          <span className="absolute top-3 left-3 bg-surface/95 backdrop-blur border border-line px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase text-ink-muted rounded-field">
            {product.category.name}
          </span>
        )}
      </Link>
      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        <div className="space-y-1">
          <h3 className="font-display text-xl text-ink font-semibold leading-snug">
            <Link href={`/p/${product.slug}`} className="hover:text-brand transition-colors">
              {product.name}
            </Link>
          </h3>
        </div>
        <div className="pt-3 border-t border-line flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-ink-faint block">Estimated</span>
            <p className="text-base font-bold text-ink numeric">
              {priceLabel}
            </p>
          </div>
          <ButtonLink href={`/p/${product.slug}`} intent="quiet" size="md">
            Details →
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
