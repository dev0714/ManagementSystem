import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';

import { LoginForm, type DemoAccount } from './LoginForm';

export const dynamic = 'force-dynamic';

/** Demo account picker is only rendered when DEMO_PASSWORD is configured. */
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? null;

export default async function LoginPage() {
  if (await getSession()) redirect('/');

  let accounts: DemoAccount[] = [];
  let configError: string | null = null;
  let modulePitch = [
    { icon: '🕌', name: 'JK Masjid Operations', stat: '12 sites' },
    { icon: '🚐', name: 'Fleet Management', stat: '14 vehicles' },
    { icon: '🏠', name: 'Property Management', stat: '24 properties' },
  ];

  try {
    const client = db();

    if (DEMO_PASSWORD) {
      const { data } = await client
        .from('users')
        .select('email, name, initials, title, scope_label, scope_tone, tenants!inner(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(20);

      accounts = (data ?? []).map((u) => {
        const t = u.tenants as unknown as { name: string } | { name: string }[];
        return {
          email: u.email as string,
          name: u.name as string,
          initials: u.initials as string,
          title: u.title as string,
          scope: u.scope_label as string,
          scopeTone: toneOf(u.scope_tone),
          tenantName: Array.isArray(t) ? t[0]?.name ?? '' : t?.name ?? '',
        };
      });
    }

    const [sites, vehicles, props] = await Promise.all([
      client.from('sites').select('id', { count: 'exact', head: true }),
      client.from('vehicles').select('id', { count: 'exact', head: true }),
      client.from('properties').select('id', { count: 'exact', head: true }),
    ]);
    modulePitch = [
      { icon: '🕌', name: 'JK Masjid Operations', stat: `${sites.count ?? 0} sites` },
      { icon: '🚐', name: 'Fleet Management', stat: `${vehicles.count ?? 0} vehicles` },
      { icon: '🏠', name: 'Property Management', stat: `${props.count ?? 0} properties` },
    ];
  } catch (e) {
    configError = e instanceof Error ? e.message : 'Could not reach the database.';
  }

  return (
    <main className="login">
      <div className="login__pitch">
        <div className="login__lockup">
          <div className="login__mark">CC</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Cellular Citi Group</div>
            <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: '.3px' }}>OPERATIONS CRM</div>
          </div>
        </div>

        <div style={{ maxWidth: 460 }}>
          <div className="login__headline">One login. Every operation in the group.</div>
          <div className="login__blurb">
            Prayer facilities, fleet and property run on the same contact records, the same alert engine and the same
            WhatsApp gateway. Staff, tenants and contractors each sign in to their own workspace.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 30 }}>
            {modulePitch.map((m) => (
              <div className="login__pill" key={m.name}>
                <span style={{ fontSize: 17 }} aria-hidden>
                  {m.icon}
                </span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{m.name}</span>
                <span style={{ fontSize: 12, opacity: 0.75 }}>{m.stat}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.6 }}>Protected by role-based access · POPIA compliant</div>
      </div>

      <div className="login__form-wrap">
        {configError ? (
          <div style={{ maxWidth: 400 }}>
            <div className="banner banner--bad" role="alert">
              {configError}
            </div>
            <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
              Copy <code>.env.example</code> to <code>.env.local</code> and fill in the Supabase credentials, then
              restart the dev server.
            </p>
          </div>
        ) : (
          <LoginForm accounts={accounts} demoPassword={DEMO_PASSWORD} />
        )}
      </div>
    </main>
  );
}
