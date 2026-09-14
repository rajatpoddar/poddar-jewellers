import Link from 'next/link';
import { Shop } from '@prisma/client';
import { ButtonLink } from '@/components/ui/Button';

export function Header({ shop }: { shop: Shop & { whatsappNumber?: string } }) {
  const whatsappNumber = shop.whatsappNumber || shop.whatsapp;

  return (
    <header className="border-b border-line bg-surface sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold text-ink">
          {shop.name}
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-ink-muted">
          <Link href="/" className="hover:text-ink transition-colors">Home</Link>
          <Link href="/rates" className="hover:text-ink transition-colors">Aaj ka Rate</Link>
          <Link href="/contact" className="hover:text-ink transition-colors">Contact</Link>
        </nav>
        <div className="flex items-center space-x-3">
          <ButtonLink href={`https://wa.me/${whatsappNumber}`} intent="secondary" size="md">
            WhatsApp
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
