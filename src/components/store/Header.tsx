'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Shop } from '@prisma/client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { WishlistHeaderBadge } from './WishlistHeaderBadge';
import { AuthModal } from './AuthModal';
import { logoutCustomerAction } from '@/app/(store)/login/actions';

export interface HeaderProps {
  shop: Shop & { whatsappNumber?: string };
  customer?: { name: string } | null;
}

export function Header({ shop, customer }: HeaderProps) {
  const router = useRouter();
  const whatsappNumber = shop.whatsappNumber || shop.whatsapp;
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logoutCustomerAction();
    setIsLoggingOut(false);
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-surface sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold text-ink">
          {shop.name}
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-ink-muted">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <Link href="/contact" className="hover:text-ink transition-colors">
            Contact
          </Link>
        </nav>
        <div className="flex items-center space-x-3">
          <Link
            href="/search"
            aria-label="Search catalogue"
            className="p-2 text-ink-muted hover:text-ink transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center"
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

          {customer ? (
            <div className="flex items-center gap-2 border-l border-line pl-3">
              <span className="text-sm font-medium text-ink hidden sm:inline">
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

          <ButtonLink href={`https://wa.me/${whatsappNumber}`} intent="secondary" size="md">
            WhatsApp
          </ButtonLink>
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
