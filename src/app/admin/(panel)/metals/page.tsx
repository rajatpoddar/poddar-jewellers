import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { updateMetalType, deactivateMetalType, reactivateMetalType } from './actions';
import { NewMetalForm } from './form';

export const dynamic = 'force-dynamic';

export default async function MetalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const shop = await getShop();
  const metals = await db.metalType.findMany({
    where: { shopId: shop.id },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">Metal types</h1>
        <p className="text-stone-600 mt-1 max-w-2xl">
          Aapki dukaan kaun-kaun se metal aur purity me kaam karti hai. Yahan naya
          jodte hi <strong>Aaj ka Rate</strong> screen par uska box apne aap aa jayega.
        </p>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded p-4 text-red-900">{error}</div>
      )}

      <div className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
        {metals.map((m) => (
          <div key={m.id} className="p-4 flex flex-wrap items-center gap-3">
            <code className="text-sm text-stone-500 min-w-36">{m.key}</code>
            <form action={updateMetalType.bind(null, m.id)} className="flex items-center gap-3 flex-1 min-w-60">
              <input name="label" defaultValue={m.label}
                className="border border-stone-300 rounded px-3 py-2 flex-1" />
              <button type="submit" className="text-sm underline text-stone-700">Save</button>
            </form>
            <span className="text-sm text-stone-500 min-w-24">{m._count.products} products</span>
            {m.isActive ? (
              <form action={deactivateMetalType.bind(null, m.id)}>
                <button type="submit" className="text-sm underline text-stone-500">Band karein</button>
              </form>
            ) : (
              <form action={reactivateMetalType.bind(null, m.id)} className="flex items-center gap-3">
                <span className="text-xs rounded-full px-2.5 py-1 bg-stone-100 text-stone-600">band</span>
                <button type="submit" className="text-sm underline text-stone-500">Wapas chalu</button>
              </form>
            )}
          </div>
        ))}
      </div>

      <NewMetalForm />
    </div>
  );
}
