'use client';

import { useState, useEffect } from 'react';
import { Product, ProductImage, Category } from '@prisma/client';
import { ProductCard } from '@/components/store/ProductCard';
import { EmptyState } from '@/components/ui/Surface';
import { ButtonLink } from '@/components/ui/Button';
import { getWishlistIds } from '@/lib/wishlist';

type ProductWithDetails = Product & {
  images: ProductImage[];
  category?: Category | null;
};

interface WishlistClientProps {
  allProducts: ProductWithDetails[];
}

export function WishlistClient({ allProducts }: WishlistClientProps) {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWishlistIds(getWishlistIds());
    setMounted(true);

    function handleUpdate() {
      setWishlistIds(getWishlistIds());
    }

    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Aapka Saved Wishlist</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-72 bg-surface-sunk animate-pulse rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  const savedProducts = allProducts.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink">Aapka Saved Wishlist</h1>
          <p className="text-sm text-ink-muted mt-1">
            {savedProducts.length} {savedProducts.length === 1 ? 'design' : 'designs'} aapne pasand kiye hain
          </p>
        </div>
        {savedProducts.length > 0 && (
          <ButtonLink href="/search" intent="quiet" size="md">
            Catalog Search →
          </ButtonLink>
        )}
      </div>

      {savedProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {savedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState title="Aapka Wishlist Khali Hai">
          <p className="mb-4">
            Aapko jo designs pasand aayein, unhe heart icon par tap karke yahan save kar sakte hain.
          </p>
          <ButtonLink href="/" intent="primary" size="lg">
            Explore Collection
          </ButtonLink>
        </EmptyState>
      )}
    </div>
  );
}
