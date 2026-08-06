'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { signIn } from '@/lib/auth';

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Enter your email address and password.' };

  const ua = (await headers()).get('user-agent') ?? undefined;
  const result = await signIn(email, password, ua);

  if ('error' in result) return { error: result.error };
  redirect(result.home);
}
