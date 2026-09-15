import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';

type Slide = {
  id: string;
  badge: string;
  heading: string;
  subheading: string;
  desktopImage: string;
  mobileImage: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
};

export function HeroCarousel({
  shopName,
  shopCity,
  whatsappNumber,
}: {
  shopName: string;
  shopCity: string;
  whatsappNumber: string;
}) {
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');

  const slides: Slide[] = [
    {
      id: 'heritage',
      badge: 'ROYAL HERITAGE · 100% BIS HALLMARKED',
      heading: `${shopName} — Pure Gold & Diamond Masterpieces`,
      subheading: `${shopCity} ka sabse shandar jewellery collection ab aapke phone par. Guaranteed hallmark purity, live daily estimations, aur ghar baithe WhatsApp video assistance.`,
      desktopImage: '/images/hero-desktop.png',
      mobileImage: '/images/hero-mobile.png',
      primaryCtaText: 'Explore Collection',
      primaryCtaHref: '#collection',
      secondaryCtaText: 'WhatsApp Video Call',
      secondaryCtaHref: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Namaste ${shopName}! Mujhe exclusive jewellery designs aur live video assistance ke baare mein poochhna tha.`
      )}`,
    },
    {
      id: 'bridal',
      badge: 'BRIDAL SPECIAL · HANDCRAFTED ARTISTRY',
      heading: 'Vivah & Utsav Masterpieces',
      subheading: 'Khaas maukon ke liye 22K gold Rani Haar, choker, aur bridal sets. Custom weight customization aur virtual trial available.',
      desktopImage: '/images/hero-bridal.png',
      mobileImage: '/images/hero-bridal-mobile.png',
      primaryCtaText: 'Bridal Collection',
      primaryCtaHref: '/c/gold',
      secondaryCtaText: 'Bridal Consultation',
      secondaryCtaHref: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Namaste ${shopName}! Mujhe Bridal Jewellery collection aur custom orders ke baare mein poochhna tha.`
      )}`,
    },
    {
      id: 'craftsmanship',
      badge: 'TRUSTED HERITAGE · EXPERT GOLDSMITHS',
      heading: 'Handcrafted With Unmatched Precision',
      subheading: 'Purity aur trust ka paka wada. Official BIS Hallmark certificate ke sath har ornament par guaranteed quality.',
      desktopImage: '/images/hero-craftsmanship.png',
      mobileImage: '/images/hero-craftsmanship-mobile.png',
      primaryCtaText: 'Store Location',
      primaryCtaHref: '/contact',
      secondaryCtaText: 'WhatsApp Chat',
      secondaryCtaHref: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Namaste ${shopName}! Mujhe store visit timing aur location ke baare mein jaankari chahiye.`
      )}`,
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartRef = useRef<number | null>(null);
  const touchStartPosYRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const touchEndPosYRef = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
    touchStartPosYRef.current = e.targetTouches[0].clientY;
    touchEndRef.current = null;
    touchEndPosYRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
    touchEndPosYRef.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current === null || touchEndRef.current === null) return;
    const deltaX = touchStartRef.current - touchEndRef.current;
    const deltaY = (touchStartPosYRef.current || 0) - (touchEndPosYRef.current || 0);

    // Trigger swipe if horizontal drag > 40px and dominant over vertical scroll
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const activeSlide = slides[currentIndex];

  return (
    <section
      className="relative bg-surface-sunk border-b border-line overflow-hidden group min-h-[480px] md:min-h-[560px] flex items-center touch-pan-y"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <Image
          src={activeSlide.desktopImage}
          alt={activeSlide.heading}
          fill
          priority
          className="object-cover object-center hidden md:block transition-opacity duration-700"
          sizes="(max-width: 768px) 0px, 100vw"
        />
        <Image
          src={activeSlide.mobileImage}
          alt={activeSlide.heading}
          fill
          priority
          className="object-cover object-center md:hidden transition-opacity duration-700"
          sizes="(max-width: 768px) 100vw, 0px"
        />
        {/* Dark Luxury Gradient Overlay for Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-ground/90 via-ground/75 to-ground/40" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 md:py-24 w-full">
        <div className="max-w-2xl space-y-6 text-left">
          <div className="inline-flex items-center gap-2 bg-surface/90 backdrop-blur border border-line px-4 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-widest text-brand shadow-card">
            <span>{activeSlide.badge}</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-ink font-extrabold tracking-tight leading-[1.1] transition-all duration-500">
            {activeSlide.heading}
          </h1>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed font-body font-normal transition-all duration-500">
            {activeSlide.subheading}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-md">
            <ButtonLink href={activeSlide.primaryCtaHref} intent="primary" size="lg" className="justify-center px-8">
              {activeSlide.primaryCtaText}
            </ButtonLink>
            <ButtonLink href={activeSlide.secondaryCtaHref} intent="secondary" size="lg" className="justify-center px-8">
              {activeSlide.secondaryCtaText}
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Carousel Controls: Arrows */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Previous Slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-pill bg-surface/80 hover:bg-surface border border-line flex items-center justify-center text-ink transition-colors cursor-pointer"
      >
        ←
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next Slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-pill bg-surface/80 hover:bg-surface border border-line flex items-center justify-center text-ink transition-colors cursor-pointer"
      >
        →
      </button>

      {/* Carousel Indicators: Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-2 rounded-pill transition-all duration-300 cursor-pointer ${
              idx === currentIndex ? 'w-8 bg-brand' : 'w-2 bg-line-strong hover:bg-ink-muted'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
