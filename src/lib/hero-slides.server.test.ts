import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    heroSlide: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

import { db } from '@/lib/db';
import {
  getActiveHeroSlides,
  getAllHeroSlides,
  createHeroSlide,
  reorderHeroSlides,
  deleteHeroSlide,
  CreateHeroSlideInput,
} from './hero-slides.server';

describe('hero-slides.server data layer', () => {
  const shopId = 'shop_123';
  const now = new Date('2026-09-16T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveHeroSlides', () => {
    it('fetches active hero slides within valid date bounds sorted by sortOrder asc', async () => {
      const mockSlides = [
        { id: 'hs1', title: 'Festive Offer 1', sortOrder: 0, isActive: true },
        { id: 'hs2', title: 'Festive Offer 2', sortOrder: 1, isActive: true },
      ];
      vi.mocked(db.heroSlide.findMany).mockResolvedValue(mockSlides as any);

      const result = await getActiveHeroSlides(shopId, now);

      expect(result).toEqual(mockSlides);
      expect(db.heroSlide.findMany).toHaveBeenCalledWith({
        where: {
          shopId,
          isActive: true,
          AND: [
            {
              OR: [{ startDate: null }, { startDate: { lte: now } }],
            },
            {
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
          ],
        },
        include: {
          promotion: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('getAllHeroSlides', () => {
    it('fetches all hero slides for shop sorted by sortOrder asc', async () => {
      const mockSlides = [
        { id: 'hs1', title: 'Slide 1', sortOrder: 0 },
        { id: 'hs2', title: 'Slide 2', sortOrder: 1 },
      ];
      vi.mocked(db.heroSlide.findMany).mockResolvedValue(mockSlides as any);

      const result = await getAllHeroSlides(shopId);

      expect(result).toEqual(mockSlides);
      expect(db.heroSlide.findMany).toHaveBeenCalledWith({
        where: { shopId },
        include: {
          promotion: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('createHeroSlide', () => {
    it('creates a new hero slide with shopId and converted dates', async () => {
      const input: CreateHeroSlideInput = {
        title: 'Diwali Dhamaka',
        subtitle: '20% off making charges',
        imageUrl: 'https://example.com/banner.jpg',
        mobileImageUrl: 'https://example.com/mobile-banner.jpg',
        ctaText: 'Shop Now',
        ctaUrl: '/category/necklaces',
        sortOrder: 1,
        isActive: true,
        startDate: '2026-09-15T00:00:00Z',
        endDate: '2026-09-25T23:59:59Z',
        promotionId: 'promo_456',
      };

      const mockCreated = { id: 'hs_new', shopId, ...input };
      vi.mocked(db.heroSlide.create).mockResolvedValue(mockCreated as any);

      const result = await createHeroSlide(shopId, input);

      expect(result).toEqual(mockCreated);
      expect(db.heroSlide.create).toHaveBeenCalledWith({
        data: {
          shopId,
          title: 'Diwali Dhamaka',
          subtitle: '20% off making charges',
          imageUrl: 'https://example.com/banner.jpg',
          mobileImageUrl: 'https://example.com/mobile-banner.jpg',
          ctaText: 'Shop Now',
          ctaUrl: '/category/necklaces',
          sortOrder: 1,
          isActive: true,
          startDate: new Date('2026-09-15T00:00:00Z'),
          endDate: new Date('2026-09-25T23:59:59Z'),
          promotionId: 'promo_456',
        },
        include: {
          promotion: true,
        },
      });
    });
  });

  describe('reorderHeroSlides', () => {
    it('updates sortOrder for slide ids inside a transaction', async () => {
      const slideIds = ['hs2', 'hs3', 'hs1'];
      vi.mocked(db.heroSlide.updateMany).mockResolvedValue({ count: 1 });

      await reorderHeroSlides(shopId, slideIds);

      expect(db.heroSlide.updateMany).toHaveBeenCalledTimes(3);
      expect(db.heroSlide.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'hs2', shopId },
        data: { sortOrder: 0 },
      });
      expect(db.heroSlide.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'hs3', shopId },
        data: { sortOrder: 1 },
      });
      expect(db.heroSlide.updateMany).toHaveBeenNthCalledWith(3, {
        where: { id: 'hs1', shopId },
        data: { sortOrder: 2 },
      });
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe('deleteHeroSlide', () => {
    it('deletes slide by id when shopId is provided', async () => {
      vi.mocked(db.heroSlide.deleteMany).mockResolvedValue({ count: 1 });

      await deleteHeroSlide('hs1', shopId);

      expect(db.heroSlide.deleteMany).toHaveBeenCalledWith({
        where: { id: 'hs1', shopId },
      });
    });

    it('deletes slide by id when shopId is omitted', async () => {
      vi.mocked(db.heroSlide.delete).mockResolvedValue({ id: 'hs1' } as any);

      await deleteHeroSlide('hs1');

      expect(db.heroSlide.delete).toHaveBeenCalledWith({
        where: { id: 'hs1' },
      });
    });
  });
});
