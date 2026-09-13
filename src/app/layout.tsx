import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getShop } from '@/lib/shop';
import { brandStyle } from '@/lib/branding';

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

/**
 * The shop's five brand values land on <html> as custom properties. Every
 * colour, font and derived tint in globals.css reads from them, so a second
 * customer changes five row values and gets a coherent site — no rebuild,
 * no code branch.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const shop = await getShop();

  return (
    <html lang="en" style={brandStyle(shop)}>
      <body className="min-h-screen bg-ground text-ink">{children}</body>
    </html>
  );
}
