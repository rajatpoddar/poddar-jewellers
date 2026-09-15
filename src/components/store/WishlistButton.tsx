'use client';

import { useState, useEffect } from 'react';
import { isInWishlist, toggleWishlist } from '@/lib/wishlist';

interface WishlistButtonProps {
  productId: string;
  className?: string;
  showText?: boolean;
}

export function WishlistButton({ productId, className = '', showText = false }: WishlistButtonProps) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(isInWishlist(productId));

    function handleUpdate() {
      setIsFav(isInWishlist(productId));
    }

    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, [productId]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleWishlist(productId);
    setIsFav(updated.includes(productId));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFav ? 'Remove from Wishlist' : 'Add to Wishlist'}
      className={`inline-flex items-center justify-center transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
    >
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          isFav ? 'text-brand fill-brand scale-110' : 'text-ink-muted fill-none hover:text-brand'
        }`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
      </svg>
      {showText && (
        <span className="ml-2 text-xs font-medium text-ink-muted">
          {isFav ? 'Saved to Wishlist' : 'Add to Wishlist'}
        </span>
      )}
    </button>
  );
}
