'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SESSION_COOKIE, signSession, sessionCookieOptions } from '@/auth/session';

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  const user = await db.adminUser.findUnique({ where: { username } });
  // Compare against a dummy hash when the user is absent, so a wrong username
  // and a wrong password take the same time to answer.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    return { error: 'Username ya password galat hai.' };
  }

  const token = await signSession({ sub: user.id, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);

  // Only ever bounce back into the admin area — never to an attacker's URL.
  redirect(next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/admin/login');
}
