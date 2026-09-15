'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import {
  CameraIcon,
  CategoryIcon,
  MetalIcon,
  OrderIcon,
  ProductIcon,
  RateIcon,
  SettingsIcon,
  UserIcon,
} from '@/components/ui/icons';

/**
 * Order is by how often the shop touches it. "Aaj ka Rate" is the daily job
 * and stays first and leftmost — Hard Rule 4 makes that screen a 30-second
 * task, and a 30-second task cannot start with hunting for the tab.
 */
const LINKS: Array<{ href: string; label: string; icon: ReactNode }> = [
  { href: '/admin', label: 'Aaj ka Rate', icon: <RateIcon /> },
  { href: '/admin/orders', label: 'Orders', icon: <OrderIcon /> },
  { href: '/admin/products', label: 'Products', icon: <ProductIcon /> },
  { href: '/admin/customers', label: 'Customers', icon: <UserIcon /> },
  { href: '/admin/categories', label: 'Categories', icon: <CategoryIcon /> },
  { href: '/admin/metals', label: 'Metal types', icon: <MetalIcon /> },
  { href: '/admin/photos', label: 'Photo prompts', icon: <CameraIcon /> },
  { href: '/admin/settings', label: 'Settings', icon: <SettingsIcon /> },
];

/**
 * `/admin` would otherwise light up on every screen beneath it, so the daily
 * rate tab matches exactly and the rest match their subtree.
 */
function isCurrent(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    // Scrolls sideways on a phone rather than wrapping into a second ragged
    // row; the scrollbar is hidden because the cut-off tab is the affordance.
    <nav aria-label="Admin" className="-mb-px overflow-x-auto">
      <ul className="flex min-w-max gap-1">
        {LINKS.map((link) => {
          const current = isCurrent(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className={cx(
                  'flex min-h-11 items-center gap-2 border-b-2 px-3 text-[0.9375rem]',
                  'transition-colors',
                  current
                    ? 'border-brand font-medium text-ink'
                    : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
                )}
              >
                <span className={current ? 'text-brand' : 'text-ink-faint'}>{link.icon}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
