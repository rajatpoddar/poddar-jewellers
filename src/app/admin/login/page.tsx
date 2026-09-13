import { getShop } from '@/lib/shop';
import { LoginForm } from './form';

/**
 * A server component reads `next` from the URL and hands it to the client form.
 * Reading it with useSearchParams() instead would force a Suspense boundary for
 * no benefit.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, shop] = await Promise.all([searchParams, getShop()]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-6">
      <div className="w-full max-w-sm">
        {/* The shop's own name, so the person logging in can see at a glance
            that this is their shop and not another deployment. */}
        <div className="mb-7 text-center">
          <p className="font-display text-3xl leading-tight text-ink">{shop.name}</p>
          {shop.tagline && <p className="mt-1 text-sm text-ink-faint">{shop.tagline}</p>}
        </div>
        <LoginForm next={next ?? '/admin'} />
      </div>
    </main>
  );
}
