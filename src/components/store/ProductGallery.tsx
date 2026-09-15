'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ProductImage } from '@prisma/client';

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

export function ProductGallery({ images, name, categorySlug }: { images: ProductImage[]; name: string; categorySlug?: string }) {
  const [activeImage, setActiveImage] = useState<ProductImage | null>(images[0] || null);

  const fallbackSrc = getFallbackImage(categorySlug);

  if ((!images || images.length === 0) && fallbackSrc) {
    return (
      <div className="relative aspect-square rounded-card overflow-hidden bg-surface border border-line">
        <Image
          src={fallbackSrc}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
    );
  }

  if (!images || images.length === 0 || !activeImage) {
    return (
      <div className="aspect-square bg-surface-sunk rounded-card border border-line flex items-center justify-center text-ink-faint">
        No Image Available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-square rounded-card overflow-hidden bg-surface border border-line">
        <Image
          src={getImageUrl(activeImage)}
          alt={activeImage.alt || name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveImage(img)}
              className={`relative w-20 h-20 rounded-field overflow-hidden border transition-colors shrink-0 cursor-pointer ${
                img.id === activeImage.id ? 'border-brand ring-2 ring-brand' : 'border-line'
              }`}
            >
              <Image src={getImageUrl(img)} alt={img.alt || name} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
