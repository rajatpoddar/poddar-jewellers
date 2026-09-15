import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWishlistIds,
  isInWishlist,
  toggleWishlist,
  addToWishlist,
  removeFromWishlist,
} from './wishlist';

describe('wishlist helper', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    };
    localStorage.clear();
  });

  it('starts with an empty array when localStorage is empty', () => {
    expect(getWishlistIds()).toEqual([]);
  });

  it('adds an item to wishlist and persists in localStorage', () => {
    const updated = addToWishlist('prod-1');
    expect(updated).toEqual(['prod-1']);
    expect(getWishlistIds()).toEqual(['prod-1']);
    expect(isInWishlist('prod-1')).toBe(true);
  });

  it('does not duplicate items when adding existing item', () => {
    addToWishlist('prod-1');
    const updated = addToWishlist('prod-1');
    expect(updated).toEqual(['prod-1']);
  });

  it('removes an item from wishlist', () => {
    addToWishlist('prod-1');
    addToWishlist('prod-2');
    const updated = removeFromWishlist('prod-1');
    expect(updated).toEqual(['prod-2']);
    expect(isInWishlist('prod-1')).toBe(false);
    expect(isInWishlist('prod-2')).toBe(true);
  });

  it('toggles an item in wishlist (add then remove)', () => {
    const state1 = toggleWishlist('prod-1');
    expect(state1).toEqual(['prod-1']);
    expect(isInWishlist('prod-1')).toBe(true);

    const state2 = toggleWishlist('prod-1');
    expect(state2).toEqual([]);
    expect(isInWishlist('prod-1')).toBe(false);
  });
});
