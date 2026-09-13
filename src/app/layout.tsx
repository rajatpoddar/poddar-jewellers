import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getShop } from '@/lib/shop';

/**
 * The browser-tab title comes from the shop row, never from source. This
 * software is sold to other jewellery shops; a hardcoded name here would put
 * one shop's name on another shop's tab.
 */
export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShop();
  return {
    title: { default: shop.name, template: `%s · ${shop.name}` },
    description: shop.tagline ?? undefined,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
