/**
 * End-to-end suite: drives the real UI in Chromium.
 *
 *   npm run build && npm run start          # in one terminal
 *   npm run test:e2e                        # in another
 *
 * Reads Supabase credentials from .env.local so it can reset the cleaner's
 * shift to step 0 before exercising that flow.
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch { /* optional */ }
}

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@1234';
const results = [];
const t0 = Date.now();
const check = (name, ok, extra = '') => { const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`; results.push(line); console.log(line); };

const SCHEMA = process.env.SUPABASE_DB_SCHEMA ?? 'ManagementSystem';
const SB = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const SB_HEADERS = {
  apikey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
  'Accept-Profile': SCHEMA,
  'Content-Profile': SCHEMA,
  ...(process.env.MS_SERVER_KEY ? { 'X-MS-Server-Key': process.env.MS_SERVER_KEY } : {}),
  'Content-Type': 'application/json',
};
async function resetCleanerShift() {
  const u = await (await fetch(`${SB}/users?select=id&email=eq.ridwaan@cellularciti.co.za`, { headers: SB_HEADERS })).json();
  if (!u[0]) return;
  await fetch(`${SB}/shifts?user_id=eq.${u[0].id}`, {
    method: 'PATCH',
    headers: SB_HEADERS,
    body: JSON.stringify({ clock_in_at: null, selfie_status: 'pending', checklist_state: 'Not submitted', status: 'Not started', tone: 'grey' }),
  });
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

async function session(email, password = PASSWORD) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(250);
  return { ctx, page };
}

// 1. anonymous
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  check('anonymous is sent to /login', page.url().endsWith('/login'), page.url());
  await ctx.close();
}

// 2. bad password
{
  const { ctx, page } = await session('zaid@cellularciti.co.za', 'nope');
  const body = (await page.innerText('body')).toLowerCase();
  check('wrong password shows an error and stays on /login', page.url().includes('/login') && body.includes('do not match'));
  await ctx.close();
}

// 3. super admin
{
  const { ctx, page } = await session('zaid@cellularciti.co.za');
  check('super admin lands on group overview', new URL(page.url()).pathname === '/', page.url());
  let body = (await page.innerText('body')).toLowerCase();
  check('overview renders alert feed + KPIs', body.includes('group alert feed') && body.includes('live alerts'));
  check('overview renders all three module cards', body.includes('masjid ops') && body.includes('fleet') && body.includes('property'));

  await page.goto(`${BASE}/admin/users`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('users & access lists own tenant only', body.includes('zaid hendricks') && !body.includes('nadia petersen'));

  await page.goto(`${BASE}/contacts`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('contacts list + detail render', body.includes('naledi mahlangu') && body.includes('cross-system timeline'));

  await page.click('text=Riaan van Wyk');
  await page.waitForURL(/id=/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  body = (await page.innerText('body')).toLowerCase();
  check('selecting a contact swaps the detail pane', body.includes('r 15 800 overdue'));

  await page.goto(`${BASE}/pipeline`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('pipeline board renders deals', body.includes('shoprite checkers') && body.includes('new enquiry'));

  await page.goto(`${BASE}/search?q=Kloof`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('search returns matches', body.includes('18 kloof st'));

  // Task toggle actually mutates
  await page.goto(`${BASE}/activity`, { waitUntil: 'domcontentloaded' });
  const before = (await page.innerText('body')).toLowerCase();
  await page.click('text=Approve PO-2291');
  await page.waitForTimeout(900);
  const after = (await page.innerText('body')).toLowerCase();
  check('ticking a task persists', before !== after);
  await page.click('text=Approve PO-2291'); // revert
  await page.waitForTimeout(900);

  await ctx.close();
}

// 4. cleaner
{
  const { ctx, page } = await session('ridwaan@cellularciti.co.za');
  check('cleaner lands on the shift screen', new URL(page.url()).pathname === '/jk/shift', page.url());
  let body = (await page.innerText('body')).toLowerCase();
  check('cleaner nav shows no CRM items', !body.includes('pipeline') && !body.includes('group overview'));

  await page.goto(`${BASE}/fleet`, { waitUntil: 'domcontentloaded' });
  check('cleaner typing /fleet is bounced home', new URL(page.url()).pathname === '/jk/shift', page.url());
  await page.goto(`${BASE}/admin/users`, { waitUntil: 'domcontentloaded' });
  check('cleaner typing /admin/users is bounced home', new URL(page.url()).pathname === '/jk/shift', page.url());
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  check('cleaner typing / is bounced home', new URL(page.url()).pathname === '/jk/shift', page.url());
  await ctx.close();
}

// 5. cleaner shift flow end-to-end
{
  await resetCleanerShift();
  const ctx = await browser.newContext({ permissions: [] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', 'ridwaan@cellularciti.co.za');
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(250);

  let body = (await page.innerText('body')).toLowerCase();
  if (body.includes('start the next prayer round')) {
    await page.click('text=Start the next prayer round');
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  const clockBtn = page.locator('form button[type=submit]:has-text("Clock in")');
  await clockBtn.waitFor({ timeout: 20000 }).catch(() => {});
  check('shift starts at clock-in step', (await clockBtn.count()) > 0);

  await clockBtn.click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('clock-in advances to the selfie step', body.includes('uniform selfie'));

  await page.click('button:has-text("Submit selfie")');
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('selfie advances to the checklist', body.includes('salaah readiness'));

  const submit = page.locator('button[type=submit]').last();
  check('checklist submit is disabled until every item is marked', await submit.isDisabled());

  const passButtons = page.locator('button:has-text("Pass")');
  const n = await passButtons.count();
  for (let i = 0; i < n; i++) await passButtons.nth(i).click();
  check('submit enables once all items are marked', !(await submit.isDisabled()));

  await submit.click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('checklist submission completes the shift', body.includes('shift complete'));
  await ctx.close();
}

// 6. tenant portal — log a fault, then verify it reaches the admin board
{
  const { ctx, page } = await session('naledi.m@outlook.com');
  check('tenant lands on the portal', new URL(page.url()).pathname === '/property/portal', page.url());
  let body = (await page.innerText('body')).toLowerCase();
  check('portal shows the tenant own property + rent', body.includes('18 kloof st') && body.includes('log a fault'));

  await page.goto(`${BASE}/property/invoicing`, { waitUntil: 'domcontentloaded' });
  check('tenant cannot reach invoicing', new URL(page.url()).pathname === '/property/portal', page.url());
  await page.goto(`${BASE}/jk`, { waitUntil: 'domcontentloaded' });
  check('tenant cannot reach masjid ops', new URL(page.url()).pathname === '/property/portal', page.url());

  await page.goto(`${BASE}/property/portal`, { waitUntil: 'domcontentloaded' });
  const marker = `E2E leak test ${Date.now()}`;
  await page.click('label:has-text("Electrical")');
  await page.fill('#title', marker);
  await page.click('button:has-text("Log the fault")');
  await page.waitForTimeout(900);
  body = (await page.innerText('body')).toLowerCase();
  check('tenant fault appears in their open jobs', body.includes(marker.toLowerCase()));
  check('fault auto-dispatched to the electrical contractor', body.includes('volt masters'));
  await ctx.close();

  // admin sees it
  const admin = await session('lauren@cellularciti.co.za');
  await admin.page.goto(`${BASE}/property/maintenance`, { waitUntil: 'domcontentloaded' });
  const ab = (await admin.page.innerText('body')).toLowerCase();
  check('admin fault board shows the tenant-logged job', ab.includes(marker.toLowerCase()));
  await admin.ctx.close();
}

// 7. driver day flow
{
  const { ctx, page } = await session('marius@cellularciti.co.za');
  check('driver lands on their day screen', new URL(page.url()).pathname === '/fleet/today', page.url());
  let body = (await page.innerText('body')).toLowerCase();
  check('driver sees their assigned vehicle', body.includes('ca 418-772'));
  await page.goto(`${BASE}/fleet/vehicles`, { waitUntil: 'domcontentloaded' });
  check('driver cannot reach the vehicle list', new URL(page.url()).pathname === '/fleet/today', page.url());

  await page.goto(`${BASE}/fleet/today?view=start`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  if (body.includes('log start of day')) {
    await page.fill('#odometer', '128999');
    await page.click('button:has-text("Log start of day")');
    await page.waitForTimeout(900);
    body = (await page.innerText('body')).toLowerCase();
  }
  check('start-of-day log records the odometer', body.includes('start of day logged') || body.includes('128 999'));
  await ctx.close();
}

// 8. line manager approves a claim
{
  const { ctx, page } = await session('derek@cellularciti.co.za');
  check('line manager lands on claims', new URL(page.url()).pathname === '/fleet/claims', page.url());
  const before = (await page.innerText('body')).toLowerCase();
  const approve = page.locator('button:has-text("Approve")').first();
  if (await approve.count()) {
    await approve.click();
    await page.waitForTimeout(900);
  }
  const after = (await page.innerText('body')).toLowerCase();
  check('approving a claim changes its status', before !== after);
  await ctx.close();
}

// 9. every remaining screen renders
const SCREENS = [
  ['aadil@cellularciti.co.za', '/jk', 'Site readiness'],
  ['aadil@cellularciti.co.za', '/jk/alerts', 'Salaah checklist not submitted'],
  ['aadil@cellularciti.co.za', '/jk/operations', 'Compliance by prayer'],
  ['kegan@cellularciti.co.za', '/jk/repairs', 'Repair queue'],
  ['yusuf@cellularciti.co.za', '/jk', 'My cleaners'],
  ['tania@cellularciti.co.za', '/fleet', 'Fuel & toll claims'],
  ['tania@cellularciti.co.za', '/fleet/vehicles', 'CA 776-410'],
  ['tania@cellularciti.co.za', '/fleet/checklists', 'Daily roadworthiness'],
  ['tania@cellularciti.co.za', '/fleet/events', 'Coming up'],
  ['tania@cellularciti.co.za', '/fleet/documents', 'Insurance schedule'],
  ['rehana@cellularciti.co.za', '/fleet/people', 'Driver licences'],
  ['lauren@cellularciti.co.za', '/property', 'Rent collection'],
  ['lauren@cellularciti.co.za', '/property/properties', '7 Protea Rd'],
  ['lauren@cellularciti.co.za', '/property/tenants', 'Document library'],
  ['lauren@cellularciti.co.za', '/property/onboarding', 'Property & lease'],
  ['lauren@cellularciti.co.za', '/property/maintenance', 'Fault board'],
  ['lauren@cellularciti.co.za', '/property/invoicing', 'Reminder ladder'],
  ['sipho@capeplumbing.co.za', '/property/jobs', 'open job'],
];
{
  let current = null, s = null;
  for (const [email, path, needle] of SCREENS) {
    if (email !== current) {
      if (s) await s.ctx.close();
      s = await session(email);
      current = email;
    }
    await s.page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    const body = (await s.page.innerText('body')).toLowerCase();
    const landed = new URL(s.page.url()).pathname === path;
    check(`${path} (${email.split('@')[0]})`, landed && body.includes(needle.toLowerCase()), landed ? `missing "${needle}"` : `redirected to ${s.page.url()}`);
  }
  if (s) await s.ctx.close();
}

// 10. multi-tenancy isolation
{
  const { ctx, page } = await session('owner@atlasgroup.co.za');
  check('atlas super admin signs in', new URL(page.url()).pathname === '/', page.url());
  let body = (await page.innerText('body')).toLowerCase();
  check('atlas sidebar shows its own workspace name', body.includes('atlas group'));

  await page.goto(`${BASE}/admin/users`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('atlas users are its own', body.includes('nadia petersen') && !body.includes('zaid hendricks'));

  await page.goto(`${BASE}/contacts`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('atlas contacts are its own', body.includes('pieter kruger') && !body.includes('naledi mahlangu'));

  await page.goto(`${BASE}/property/properties`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('atlas properties are its own', body.includes('14 loerie str') && !body.includes('18 kloof st'));

  await page.goto(`${BASE}/search?q=Kloof`, { waitUntil: 'domcontentloaded' });
  body = (await page.innerText('body')).toLowerCase();
  check('atlas search cannot see other tenant records', !body.includes('18 kloof st'));
  await ctx.close();
}

// 11. sign out
{
  const { ctx, page } = await session('lauren@cellularciti.co.za');
  await page.click('button[title="Sign out"]');
  await page.waitForTimeout(900);
  check('sign out returns to /login', page.url().includes('/login'), page.url());
  await page.goto(`${BASE}/property`, { waitUntil: 'domcontentloaded' });
  check('session is dead after sign out', page.url().includes('/login'), page.url());
  await ctx.close();
}

await browser.close();
console.log('\n--- summary ---');
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
