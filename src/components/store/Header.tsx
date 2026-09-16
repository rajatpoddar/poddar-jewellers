'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Shop } from '@prisma/client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { WishlistHeaderBadge } from './WishlistHeaderBadge';
import { AuthModal } from './AuthModal';
import { CatalogueDropdown } from './CatalogueDropdown';
import { logoutCustomerAction } from '@/app/(store)/login/actions';
import type { NavCategoryItem } from '@/lib/categories.server';
import { MenuIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons';

export interface HeaderProps {
  shop: Shop & { whatsappNumber?: string };
  customer?: { name: string } | null;
  categories?: NavCategoryItem[];
}

export function Header({ shop, customer, categories = [] }: HeaderProps) {
  const router = useRouter();
  const whatsappNumber = shop.whatsappNumber || shop.whatsapp;
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logoutCustomerAction();
    setIsLoggingOut(false);
    setIsMobileMenuOpen(false);
    router.refresh();
  }

  function toggleCategory(id: string) {
    setExpandedCatId((prev) => (prev === id ? null : id));
  }

  return (
    <header className="border-b border-line bg-surface/95 backdrop-blur-md sticky top-0 z-40 shadow-subtle">
      <div className="mx-auto max-w-7xl px-4 py-3.5 flex items-center justify-between gap-4">
        {/* Mobile Hamburger & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 text-ink-muted hover:text-ink transition-colors rounded-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Open navigation menu"
          >
            <MenuIcon className="size-6" />
          </button>

          <Link href="/" className="font-display text-xl sm:text-2xl font-bold tracking-tight text-brand flex items-center gap-2">
            <span>{shop.name}</span>
          </Link>
        </div>

        {/* Desktop Main Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-ink-muted">
          <Link href="/" className="hover:text-ink transition-colors py-1">
            Home
          </Link>
          <CatalogueDropdown categories={categories} />
          <Link href="/search" className="hover:text-ink transition-colors py-1">
            All Collections
          </Link>
          <Link href="/contact" className="hover:text-ink transition-colors py-1">
            Contact Us
          </Link>
        </nav>

        {/* Right Action Icons & Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            href="/search"
            aria-label="Search catalogue"
            className="p-2 text-ink-muted hover:text-ink hover:bg-surface-elevated transition-colors rounded-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center"
            title="Search Catalogue"
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
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>

          <WishlistHeaderBadge />

          {/* Desktop User Account Actions */}
          <div className="hidden sm:flex items-center gap-2 border-l border-line pl-3">
            {customer ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink">
                  Namaste, {customer.name}
                </span>
                <Button
                  intent="quiet"
                  size="md"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                intent="secondary"
                size="md"
                onClick={() => setIsAuthOpen(true)}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* WhatsApp Action Link */}
          <ButtonLink
            href={`https://wa.me/${whatsappNumber}`}
            intent="secondary"
            size="md"
            className="hidden sm:inline-flex"
          >
            WhatsApp
          </ButtonLink>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Sheet */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-out Drawer Container */}
          <div className="relative w-4/5 max-w-xs bg-surface h-full shadow-2xl flex flex-col justify-between z-10 overflow-y-auto animate-slide-in">
            <div className="p-4 space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-line pb-4">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-display text-xl font-bold text-brand"
                >
                  {shop.name}
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-ink-muted hover:text-ink rounded-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label="Close menu"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Mobile Quick Search Input Shortcut */}
              <div>
                <Link
                  href="/search"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 bg-surface-sunk border border-line rounded-field text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  <span>Search jewellery designs...</span>
                  <svg
                    className="w-4 h-4 text-ink-muted"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </Link>
              </div>

              {/* Mobile Main Nav Links */}
              <nav className="space-y-1 text-sm font-medium text-ink">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-field hover:bg-surface-elevated transition-colors"
                >
                  Home
                </Link>

                <Link
                  href="/search"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-field hover:bg-surface-elevated transition-colors"
                >
                  All Collections
                </Link>

                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-field hover:bg-surface-elevated transition-colors"
                >
                  Contact Us
                </Link>

                {customer && (
                  <Link
                    href="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-field hover:bg-surface-elevated transition-colors"
                  >
                    My Orders & Bookings
                  </Link>
                )}
              </nav>

              {/* Category Accordion Section */}
              {categories && categories.length > 0 && (
                <div className="border-t border-line pt-4 space-y-2">
                  <span className="block px-3 text-xs font-bold text-ink-muted uppercase tracking-wider">
                    Catalogue Categories
                  </span>
                  <div className="space-y-1">
                    {categories.map((cat) => {
                      const isExpanded = expandedCatId === cat.id;
                      const hasChildren = cat.children && cat.children.length > 0;

                      return (
                        <div key={cat.id} className="rounded-field overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-ink hover:bg-surface-elevated transition-colors">
                            <Link
                              href={`/c/${cat.slug}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex-1 hover:text-brand transition-colors"
                            >
                              {cat.name}
                            </Link>

                            {hasChildren && (
                              <button
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className="p-1 text-ink-muted hover:text-ink focus-visible:outline-none"
                                aria-label={`Toggle ${cat.name} subcategories`}
                              >
                                {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                              </button>
                            )}
                          </div>

                          {/* Expanded Sub-categories */}
                          {hasChildren && isExpanded && (
                            <div className="bg-surface-sunk px-4 py-2 space-y-1.5 border-l-2 border-brand ml-3 my-1">
                              {cat.children!.map((subCat) => (
                                <Link
                                  key={subCat.id}
                                  href={`/c/${cat.slug}/${subCat.slug}`}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block text-xs text-ink-muted hover:text-ink py-1 transition-colors"
                                >
                                  {subCat.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Drawer Footer Actions */}
            <div className="p-4 border-t border-line bg-surface-sunk space-y-3">
              {customer ? (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-ink">
                    Namaste, {customer.name}
                  </span>
                  <Button
                    intent="quiet"
                    size="md"
                    className="w-full justify-center"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  intent="secondary"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsAuthOpen(true);
                  }}
                >
                  Sign In
                </Button>
              )}

              <ButtonLink
                href={`https://wa.me/${whatsappNumber}`}
                intent="secondary"
                size="md"
                className="w-full justify-center"
              >
                WhatsApp Us
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
