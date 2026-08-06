import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The schema name comes from an env var, so the client is not bound to a single
// schema literal and rows are not generated types. Row shapes are asserted at
// the call site instead.
type Client = SupabaseClient<any, any, string, any, any>;

/**
 * Server-only Supabase client bound to the `ManagementSystem` schema.
 *
 * Two supported credential modes:
 *  1. Secret key (`SUPABASE_SECRET_KEY`) — bypasses RLS outright.
 *  2. Publishable key + `MS_SERVER_KEY` — the schema's RLS policies only admit
 *     requests carrying the server key in `X-MS-Server-Key`, so the publishable
 *     key alone reads nothing. The key never leaves the server.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const schema = process.env.SUPABASE_DB_SCHEMA ?? 'ManagementSystem';
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serverKey = process.env.MS_SERVER_KEY;

let cached: Client | null = null;

export function db(): Client {
  if (cached) return cached;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set. Copy .env.example to .env.local.');

  const key = secretKey ?? publishableKey;
  if (!key) {
    throw new Error('Set SUPABASE_SECRET_KEY, or SUPABASE_PUBLISHABLE_KEY together with MS_SERVER_KEY.');
  }
  if (!secretKey && !serverKey) {
    throw new Error('MS_SERVER_KEY is required when using the publishable key.');
  }

  const client = createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: serverKey ? { 'X-MS-Server-Key': serverKey } : {} },
  }) as unknown as Client;

  cached = client;
  return client;
}

/** Narrow a PostgREST result, throwing with context instead of returning null. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: no data returned`);
  return res.data;
}
