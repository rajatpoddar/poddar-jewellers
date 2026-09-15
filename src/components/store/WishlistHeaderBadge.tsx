'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWishlistIds } from '@/lib/wishlist';

export function WishlistHeaderBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getWishlistIds().length);

    function handleUpdate() {
      setCount(getWishlistIds().length);
    }

    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, []);

  return (
    <Link
      href="/wishlist"
      aria-label={`View Wishlist (${count} items)`}
      className="relative p-2 text-ink-muted hover:text-ink transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center"
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-brand text-ground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center numeric">
          {count}
        </span>
      )}
    </Link>
  );
}
