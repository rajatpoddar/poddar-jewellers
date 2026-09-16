import { getShop } from '@/lib/shop';
import { getAllHeroSlides } from '@/lib/hero-slides.server';
import { getShopPromotions } from '@/lib/promotions.server';
import { CarouselClient, SerializedHeroSlide } from './CarouselClient';

export default async function AdminCarouselPage() {
  const shop = await getShop();

  const [slidesRaw, promotionsRaw] = await Promise.all([
    getAllHeroSlides(shop.id),
    getShopPromotions(shop.id),
  ]);

  const slides: SerializedHeroSlide[] = slidesRaw.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    imageUrl: s.imageUrl,
    mobileImageUrl: s.mobileImageUrl,
    ctaText: s.ctaText,
    ctaUrl: s.ctaUrl,
    sortOrder: s.sortOrder,
    isActive: s.isActive,
    startDate: s.startDate ? s.startDate.toISOString() : null,
    endDate: s.endDate ? s.endDate.toISOString() : null,
    promotionId: s.promotionId,
    promotionName: s.promotion ? s.promotion.name : null,
  }));

  const promotions = promotionsRaw.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return <CarouselClient slides={slides} promotions={promotions} />;
}
