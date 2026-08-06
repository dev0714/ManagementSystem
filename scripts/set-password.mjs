#!/usr/bin/env node
/**
 * Set a user's password in ManagementSystem.users.
 *
 *   node scripts/set-password.mjs someone@example.com 'NewPassw0rd!'
 *
 * Reads the same env vars as the app (.env.local).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* optional */
  }
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/set-password.mjs <email> <password>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
const serverKey = process.env.MS_SERVER_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and a Supabase key must be set.');
  process.exit(1);
}

const client = createClient(url, key, {
  db: { schema: process.env.SUPABASE_DB_SCHEMA ?? 'ManagementSystem' },
  auth: { persistSession: false },
  global: { headers: serverKey ? { 'X-MS-Server-Key': serverKey } : {} },
});

const password_hash = await bcrypt.hash(password, 10);
const { data, error } = await client
  .from('users')
  .update({ password_hash })
  .ilike('email', email)
  .select('email, name');

if (error) {
  console.error(error.message);
  process.exit(1);
}
if (!data?.length) {
  console.error(`No user matched ${email}.`);
  process.exit(1);
}
console.log(`Password updated for ${data[0].name} <${data[0].email}>.`);
