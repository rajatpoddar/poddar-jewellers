import Link from 'next/link';
import { logout } from '@/app/admin/login/actions';

const LINKS = [
  { href: '/admin', label: 'Aaj ka Rate' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/metals', label: 'Metal types' },
  { href: '/admin/settings', label: 'Settings' },
];

export function Nav({ shopName, adminName }: { shopName: string; adminName: string }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-5xl mx-auto px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="font-semibold text-stone-900">{shopName}</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-stone-600 hover:text-stone-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="ml-auto flex items-center gap-3">
          <span className="text-sm text-stone-500">{adminName}</span>
          <button type="submit" className="text-sm text-stone-500 underline">Logout</button>
        </form>
      </div>
    </header>
  );
}
