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
  const { next } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
      <LoginForm next={next ?? '/admin'} />
    </main>
  );
}
