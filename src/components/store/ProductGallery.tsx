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

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [activeImage, setActiveImage] = useState<ProductImage | null>(images[0] || null);

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
              <Image src={getImageUrl(img)} alt={img.alt || name} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
