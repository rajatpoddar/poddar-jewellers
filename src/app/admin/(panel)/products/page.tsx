import Link from 'next/link';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { formatINR } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const shop = await getShop();
  const products = await db.product.findMany({
    where: { shopId: shop.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      category: { select: { name: true } },
      metalType: { select: { label: true } },
      _count: { select: { weights: true, images: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-semibold text-stone-900">Products</h1>
        <Link href="/admin/products/new" className="ml-auto bg-stone-900 text-white rounded px-6 py-2.5">
          Naya product
        </Link>
      </div>

      <div className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
        {products.length === 0 && <p className="p-6 text-stone-500">Abhi koi product nahi hai.</p>}
        {products.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`}
            className="p-4 flex flex-wrap items-center gap-4 hover:bg-stone-50">
            <span className="font-medium text-stone-900 flex-1 min-w-45">{p.name}</span>
            <span className="text-sm text-stone-500 min-w-24">{p.category.name}</span>
            <span className="text-sm text-stone-500 min-w-24">{p.metalType.label}</span>
            <span className="text-sm text-stone-500 min-w-28">
              {p._count.weights} weights · {p._count.images} photos
            </span>
            <span className="text-sm tabular-nums text-stone-700 min-w-40">
              {p.cachedPriceMinPaise !== null && p.cachedPriceMaxPaise !== null
                ? `${formatINR(p.cachedPriceMinPaise)} – ${formatINR(p.cachedPriceMaxPaise)}`
                : 'aaj ka rate nahi hai'}
            </span>
            <span className={`text-xs rounded-full px-2.5 py-1 ${p.status === 'LIVE' ? 'bg-green-100 text-green-900' : 'bg-stone-100 text-stone-600'}`}>
              {p.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
