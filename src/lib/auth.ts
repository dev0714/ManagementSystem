import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

import { db } from './db';
import type { Membership, ModuleRole, ModuleSlug, Session, Tenant, Tone } from './types';

export const SESSION_COOKIE = 'ms_session';
const SESSION_DAYS = 7;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

type UserRow = {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  initials: string;
  title: string;
  scope_label: string;
  scope_tone: string;
  is_super_admin: boolean;
  has_crm: boolean;
  home_route: string;
  is_active: boolean;
  temp_access_until: string | null;
};

/** Verify credentials against the ManagementSystem.users table (not Supabase Auth). */
export async function signIn(email: string, password: string, userAgent?: string) {
  const client = db();
  const normalised = email.trim().toLowerCase();

  const { data: user } = await client
    .from('users')
    .select('*')
    .ilike('email', normalised)
    .maybeSingle<UserRow>();

  // Always run a bcrypt compare so a missing user and a wrong password cost the same.
  const hash = user?.password_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) return { error: 'Those details do not match an account.' as const };
  if (!user.is_active) return { error: 'This account has been deactivated.' as const };
  if (user.temp_access_until && new Date(user.temp_access_until) < new Date()) {
    return { error: 'Your temporary access has expired.' as const };
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  const { error } = await client.from('sessions').insert({
    tenant_id: user.tenant_id,
    user_id: user.id,
    token_hash: hashToken(token),
    user_agent: userAgent ?? null,
    expires_at: expiresAt.toISOString(),
  });
  if (error) return { error: `Could not start a session: ${error.message}` as const };

  await client.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });

  return { home: user.home_route || '/' };
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db().from('sessions').delete().eq('token_hash', hashToken(token));
  jar.delete(SESSION_COOKIE);
}

/** Resolve the caller's session. Returns null when signed out or expired. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const client = db();
  const { data: row } = await client
    .from('sessions')
    .select('id, expires_at, user_id, tenant_id')
    .eq('token_hash', hashToken(token))
    .maybeSingle<{ id: string; expires_at: string; user_id: string; tenant_id: string }>();

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await client.from('sessions').delete().eq('id', row.id);
    return null;
  }

  const { data: user } = await client
    .from('users')
    .select('*')
    .eq('id', row.user_id)
    .maybeSingle<UserRow>();
  if (!user || !user.is_active) return null;
  if (user.temp_access_until && new Date(user.temp_access_until) < new Date()) return null;

  // Tenant scoping: every subsequent query is filtered by this id, taken from the
  // session record rather than anything the client can influence.
  const { data: tenant } = await client
    .from('tenants')
    .select('id, slug, name, short_name, monogram, tagline, primary_color, is_active')
    .eq('id', user.tenant_id)
    .maybeSingle<Tenant & { is_active: boolean }>();
  if (!tenant || !tenant.is_active) return null;

  const { data: mods } = await client
    .from('user_modules')
    .select('module, role')
    .eq('user_id', user.id)
    .eq('tenant_id', user.tenant_id);

  const modules: Membership[] = (mods ?? []).map((m) => ({
    module: m.module as ModuleSlug,
    role: m.role as ModuleRole,
  }));

  return {
    userId: user.id,
    tenantId: user.tenant_id,
    tenant,
    name: user.name,
    initials: user.initials,
    title: user.title,
    email: user.email,
    scope: user.scope_label,
    scopeTone: (user.scope_tone as Tone) ?? 'grey',
    isSuperAdmin: user.is_super_admin,
    hasCrm: user.has_crm,
    modules,
    home: user.home_route || '/',
    tempAccessUntil: user.temp_access_until,
  };
}

/** Session or bust. Use at the top of every authenticated server component. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export function roleIn(session: Session, module: ModuleSlug): ModuleRole | null {
  return session.modules.find((m) => m.module === module)?.role ?? null;
}

/**
 * Authorise access to a module, optionally restricted to specific roles.
 * A cleaner typing /fleet into the address bar lands here and is bounced home.
 */
export async function requireModule(module: ModuleSlug, roles?: ModuleRole[]): Promise<{ session: Session; role: ModuleRole }> {
  const session = await requireSession();
  const role = roleIn(session, module);
  if (!role) redirect(session.home);
  if (roles && !roles.includes(role)) redirect(session.home);
  return { session, role };
}

export async function requireSuperAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!session.isSuperAdmin) redirect(session.home);
  return session;
}

export async function requireCrm(): Promise<Session> {
  const session = await requireSession();
  if (!session.hasCrm) redirect(session.home);
  return session;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function constantTimeEquals(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
