'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Card } from '@/components/ui/Surface';
import { login, type LoginState } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <Card className="p-7">
      <form action={action} className="space-y-5">
        <h1 className="font-display text-2xl text-ink">Admin Login</h1>
        <input type="hidden" name="next" value={next} />

        <Field label="Username" htmlFor="username">
          <Input id="username" name="username" required autoFocus autoComplete="username" />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>

        {state.error && <Notice tone="danger">{state.error}</Notice>}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? 'Ek minute…' : 'Login'}
        </Button>
      </form>
    </Card>
  );
}
