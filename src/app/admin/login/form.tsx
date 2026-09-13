'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="w-full max-w-sm bg-white border border-stone-200 rounded p-8 space-y-5">
      <h1 className="text-2xl font-semibold text-stone-900">Admin Login</h1>
      <input type="hidden" name="next" value={next} />

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Username</span>
        <input name="username" required autoFocus autoComplete="username"
          className="w-full border border-stone-300 rounded px-3 py-2.5 text-base" />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Password</span>
        <input name="password" type="password" required autoComplete="current-password"
          className="w-full border border-stone-300 rounded px-3 py-2.5 text-base" />
      </label>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button type="submit" disabled={pending}
        className="w-full bg-stone-900 text-white rounded py-3 text-base font-medium disabled:opacity-60">
        {pending ? 'Ek minute…' : 'Login'}
      </button>
    </form>
  );
}
