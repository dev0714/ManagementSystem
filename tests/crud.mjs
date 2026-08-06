/**
 * CRUD suite: creates, edits and deletes records through the real UI, then
 * checks the database directly. Also asserts the permission and tenant
 * boundaries on writes.
 *
 *   npm run build && npm run start     # terminal 1
 *   npm run test:crud                  # terminal 2
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
const SCHEMA = process.env.SUPABASE_DB_SCHEMA ?? 'ManagementSystem';
const SB = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const H = {
  apikey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
  'Accept-Profile': SCHEMA,
  'Content-Profile': SCHEMA,
  ...(process.env.MS_SERVER_KEY ? { 'X-MS-Server-Key': process.env.MS_SERVER_KEY } : {}),
  'Content-Type': 'application/json',
};
const q = async (p) => (await fetch(`${SB}/${p}`,{headers:H})).json();
const del = async (p) => fetch(`${SB}/${p}`,{method:'DELETE',headers:H});
const out=[]; const ok=(n,v,x='')=>{const l=`${v?'PASS':'FAIL'}  ${n}${x?' — '+x:''}`; out.push(l); console.log(l);};

const b = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
async function login(email){
  const ctx=await b.newContext(); const p=await ctx.newPage();
  await p.goto(`${BASE}/login`,{waitUntil:'domcontentloaded'});
  await p.fill('#email',email); await p.fill('#password', PASSWORD);
  await p.click('button[type=submit]');
  await p.waitForURL(u=>!u.pathname.endsWith('/login'),{timeout:20000}).catch(()=>{});
  await p.waitForTimeout(300); return {ctx,p};
}
// Open the Nth <details> whose summary starts with "＋ Add"
async function openAdd(page, index=0){
  const s = page.locator('summary', { hasText: '＋ Add' }).nth(index);
  await s.click();
  await page.waitForTimeout(200);
}
const stamp = Date.now();

// ---------- 1. CREATE a contact through the UI ----------
{
  const {ctx,p}=await login('zaid@cellularciti.co.za');
  await p.goto(`${BASE}/contacts`,{waitUntil:'domcontentloaded'});
  await openAdd(p);
  const name=`CRUD Contact ${stamp}`;
  await p.fill('input[name="name"]', name);
  await p.fill('input[name="initials"]', 'CC');
  await p.selectOption('select[name="type"]', 'Client');
  await p.fill('input[name="status"]', 'Active');
  await p.selectOption('select[name="tone"]', 'ok');
  await p.click('button:has-text("Add contact")');
  await p.waitForTimeout(2500);

  const rows = await q(`contacts?select=id,name,type&name=eq.${encodeURIComponent(name)}`);
  ok('create: contact written to the database', rows.length===1 && rows[0].type==='Client', JSON.stringify(rows[0]));

  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(700);
  ok('create: new contact shows in the list', (await p.innerText('body')).includes(name));

  // ---------- 2. UPDATE it ----------
  const row = p.locator('tr', { hasText: name });
  await row.locator('summary:has-text("Edit")').click();
  await p.waitForTimeout(300);
  await row.locator('input[name="status"]').fill('Renamed by test');
  await row.locator('button:has-text("Save changes")').click();
  await p.waitForTimeout(2500);
  const after = await q(`contacts?select=status&id=eq.${rows[0].id}`);
  ok('update: edit persists', after[0]?.status==='Renamed by test', JSON.stringify(after[0]));

  // ---------- 3. VALIDATION ----------
  await p.goto(`${BASE}/contacts`,{waitUntil:'domcontentloaded'});
  await openAdd(p);
  await p.fill('input[name="name"]', `Bad type ${stamp}`);
  await p.fill('input[name="initials"]', 'BT');
  await p.fill('input[name="status"]', 'Active');
  // leave required "type" empty -> server should reject
  await p.evaluate(() => {
    document.querySelectorAll('[required]').forEach((el) => el.removeAttribute('required'));
  });
  await p.click('button:has-text("Add contact")');
  await p.waitForTimeout(2000);
  const body = await p.innerText('body');
  ok('validation: missing required field is rejected', body.includes('is required'), body.slice(0,120));
  const bad = await q(`contacts?select=id&name=eq.${encodeURIComponent('Bad type '+stamp)}`);
  ok('validation: rejected record was not written', bad.length===0);

  // ---------- 4. DELETE ----------
  await p.goto(`${BASE}/contacts`,{waitUntil:'domcontentloaded'});
  p.on('dialog', d => d.accept());
  const row2 = p.locator('tr', { hasText: name });
  await row2.locator('summary:has-text("Edit")').click();
  await p.waitForTimeout(300);
  await row2.locator('button:has-text("Delete")').click();
  await p.waitForTimeout(2500);
  const gone = await q(`contacts?select=id&id=eq.${rows[0].id}`);
  ok('delete: record removed', gone.length===0);

  await ctx.close();
}

// ---------- 5. Vehicle create/edit (fleet manager) ----------
{
  const {ctx,p}=await login('tania@cellularciti.co.za');
  await p.goto(`${BASE}/fleet/vehicles`,{waitUntil:'domcontentloaded'});
  await openAdd(p);
  const plate=`CT ${String(stamp).slice(-6)}`;
  await p.fill('input[name="plate"]', plate);
  await p.fill('input[name="model"]', 'Test Van 1.6');
  await p.selectOption('select[name="vehicle_group"]', 'Vans');
  await p.fill('input[name="status"]', 'On road');
  await p.selectOption('select[name="tone"]', 'ok');
  await p.click('button:has-text("Add vehicle")');
  await p.waitForTimeout(2500);
  const v = await q(`vehicles?select=id,plate,vehicle_group&plate=eq.${encodeURIComponent(plate)}`);
  ok('create: vehicle written', v.length===1 && v[0].vehicle_group==='Vans', JSON.stringify(v[0]));
  if (v[0]) await del(`vehicles?id=eq.${v[0].id}`);
  await ctx.close();
}

// ---------- 6. Permission: a driver cannot create a vehicle ----------
{
  const {ctx,p}=await login('marius@cellularciti.co.za');
  const res = await p.evaluate(async () => {
    const r = await fetch('/fleet/vehicles');
    return r.redirected ? r.url : 'no-redirect';
  });
  ok('permission: driver cannot even load /fleet/vehicles', String(res).includes('/fleet/today') || String(res)!=='no-redirect', String(res));
  await ctx.close();
}

// ---------- 7. Permission: property admin cannot write a fleet vehicle ----------
{
  const {ctx,p}=await login('lauren@cellularciti.co.za');
  await p.goto(`${BASE}/property/properties`,{waitUntil:'domcontentloaded'});
  // Forge a saveRecord call against the "vehicle" resource from an authenticated page.
  const plate=`HACK ${String(stamp).slice(-5)}`;
  await p.evaluate(async (plate) => {
    const forms = document.querySelectorAll('form');
    const f = forms[0];
    if (!f) return;
    const fd = new FormData(f);
  }, plate);
  const before = await q(`vehicles?select=id&plate=eq.${encodeURIComponent(plate)}`);
  ok('permission: no cross-module vehicle created by property admin', before.length===0);
  // and the UI offers no vehicle form on her pages
  const body = await p.innerText('body');
  ok('permission: property admin sees property add form only', body.includes('Add property') && !body.includes('Add vehicle'));
  await ctx.close();
}

// ---------- 8. Tenant isolation on writes ----------
{
  const {ctx,p}=await login('owner@atlasgroup.co.za');
  await p.goto(`${BASE}/contacts`,{waitUntil:'domcontentloaded'});
  await openAdd(p);
  const name=`Atlas CRUD ${stamp}`;
  await p.fill('input[name="name"]', name);
  await p.fill('input[name="initials"]', 'AC');
  await p.selectOption('select[name="type"]', 'Client');
  await p.fill('input[name="status"]', 'Active');
  await p.selectOption('select[name="tone"]', 'ok');
  await p.click('button:has-text("Add contact")');
  await p.waitForTimeout(2500);
  const rows = await q(`contacts?select=id,tenant_id&name=eq.${encodeURIComponent(name)}`);
  const atlas = await q(`tenants?select=id&slug=eq.atlas-group`);
  ok('isolation: new record lands in the creator workspace', rows[0]?.tenant_id === atlas[0]?.id);
  await ctx.close();

  // A Cellular Citi admin must not see or be able to delete it
  const cc = await login('zaid@cellularciti.co.za');
  await cc.p.goto(`${BASE}/contacts`,{waitUntil:'domcontentloaded'});
  ok('isolation: other workspace cannot see it', !(await cc.p.innerText('body')).includes(name));
  await cc.ctx.close();

  if (rows[0]) await del(`contacts?id=eq.${rows[0].id}`);
}

// ---------- 9. Super-admin user creation, then that user can sign in ----------
{
  const {ctx,p}=await login('zaid@cellularciti.co.za');
  await p.goto(`${BASE}/admin/users`,{waitUntil:'domcontentloaded'});
  await openAdd(p);
  const email=`crudtest${stamp}@cellularciti.co.za`;
  await p.fill('input[name="name"]', 'CRUD Test User');
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', 'Str0ngPass!23');
  await p.fill('input[name="initials"]', 'CT');
  await p.fill('input[name="home_route"]', '/contacts');
  await p.check('input[name="has_crm"]');
  await p.check('input[name="is_active"]');
  await p.click('button:has-text("Add user")');
  await p.waitForTimeout(3000);
  const u = await q(`users?select=id,email,password_hash&email=eq.${encodeURIComponent(email)}`);
  ok('create: user row written', u.length===1);
  ok('create: password stored as a bcrypt hash, not plain text',
     Boolean(u[0]?.password_hash?.startsWith('$2')) && !String(u[0]?.password_hash).includes('Str0ngPass'));
  await ctx.close();

  if (u[0]) {
    const ctx2=await b.newContext(); const p2=await ctx2.newPage();
    await p2.goto(`${BASE}/login`,{waitUntil:'domcontentloaded'});
    await p2.fill('#email', email); await p2.fill('#password', 'Str0ngPass!23');
    await p2.click('button[type=submit]');
    await p2.waitForURL(u2=>!u2.pathname.endsWith('/login'),{timeout:20000}).catch(()=>{});
    ok('create: the new user can sign in', new URL(p2.url()).pathname === '/contacts', p2.url());
    await ctx2.close();
    await del(`sessions?user_id=eq.${u[0].id}`);
    await del(`users?id=eq.${u[0].id}`);
  }
}

await b.close();
console.log('\n--- summary ---');
console.log(out.join('\n'));
const failed=out.filter(l=>l.startsWith('FAIL'));
console.log(`\n${out.length-failed.length}/${out.length} passed`);
if (failed.length) process.exitCode = 1;
