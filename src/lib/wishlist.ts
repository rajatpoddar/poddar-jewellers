const WISHLIST_KEY = 'jewel_wishlist';

export function getWishlistIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function isInWishlist(productId: string): boolean {
  if (!productId) return false;
  const current = getWishlistIds();
  return current.includes(productId);
}

export function addToWishlist(productId: string): string[] {
  if (!productId) return getWishlistIds();
  const current = getWishlistIds();
  if (current.includes(productId)) return current;
  const next = [...current, productId];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wishlist-updated'));
      }
    } catch {
      // localStorage quota or security exception
    }
  }
  return next;
}

export function removeFromWishlist(productId: string): string[] {
  if (!productId) return getWishlistIds();
  const current = getWishlistIds();
  const next = current.filter((id) => id !== productId);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wishlist-updated'));
      }
    } catch {
      // localStorage exception
    }
  }
  return next;
}

export function toggleWishlist(productId: string): string[] {
  if (isInWishlist(productId)) {
    return removeFromWishlist(productId);
  } else {
    return addToWishlist(productId);
  }
}
