import { Avatar, KpiRow, SectionCard, StatusPill } from '@/components/ui';
import { requireSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { SOURCE_LABEL, relative } from '@/lib/format';
import { kpis } from '@/lib/queries';
import type { SourceSlug } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  name: string;
  email: string;
  initials: string;
  title: string;
  is_super_admin: boolean;
  has_crm: boolean;
  is_active: boolean;
  temp_access_until: string | null;
  last_active_at: string | null;
};

export default async function UsersPage() {
  const session = await requireSuperAdmin();
  const client = db();

  const [board, usersRes, modsRes] = await Promise.all([
    kpis(session.tenantId, 'users'),
    client
      .from('users')
      .select('id, name, email, initials, title, is_super_admin, has_crm, is_active, temp_access_until, last_active_at')
      .eq('tenant_id', session.tenantId)
      .order('created_at'),
    client.from('user_modules').select('user_id, module, role').eq('tenant_id', session.tenantId),
  ]);

  const users = (usersRes.data ?? []) as Row[];
  const mods = modsRes.data ?? [];

  function systemsFor(userId: string): SourceSlug[] {
    const user = users.find((u) => u.id === userId);
    const list: SourceSlug[] = user?.has_crm ? ['crm'] : [];
    for (const m of mods.filter((m) => m.user_id === userId)) list.push(m.module as SourceSlug);
    return list;
  }

  function roleLabel(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (user?.is_super_admin) return 'Super admin';
    const m = mods.find((m) => m.user_id === userId);
    return m ? `${SOURCE_LABEL[m.module as SourceSlug]} · ${m.role}` : 'No module';
  }

  function status(u: Row) {
    if (!u.is_active) return { label: 'Disabled', tone: 'grey' as const };
    if (u.temp_access_until) {
      const hours = Math.max(0, Math.round((new Date(u.temp_access_until).getTime() - Date.now()) / 3_600_000));
      return { label: `Temp · ${hours} h`, tone: 'warn' as const };
    }
    return { label: 'Active', tone: 'ok' as const };
  }

  return (
    <div className="page">
      <KpiRow kpis={board} columns={4} />

      <SectionCard
        title="Users & access"
        subtitle={`${users.length} people in ${session.tenant.name} · workspace-scoped`}
        flush
      >
        <div className="table__scroll">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Systems</th>
                <th>Last active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const s = status(u);
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="row">
                        <Avatar initials={u.initials} size="sm" />
                        <span>
                          <span className="strong" style={{ display: 'block' }}>
                            {u.name}
                          </span>
                          <span className="muted">{u.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>{roleLabel(u.id)}</td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                        {systemsFor(u.id).map((s2, i) => (
                          <span className={`chip src-${s2}`} key={`${s2}-${i}`}>
                            {SOURCE_LABEL[s2]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="num">{u.last_active_at ? relative(u.last_active_at) : 'Never'}</td>
                    <td>
                      <StatusPill tone={s.tone}>{s.label}</StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Multi-tenancy" subtitle="How isolation is enforced">
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9, fontSize: 13 }}>
          <li>
            Every row in the <code>ManagementSystem</code> schema carries a <code>tenant_id</code>; this list only shows{' '}
            <strong>{session.tenant.name}</strong>.
          </li>
          <li>The tenant is read from the server-side session record, never from a request parameter.</li>
          <li>Reads and writes both filter on it, so an id borrowed from another workspace matches nothing.</li>
          <li>Sign-in uses the schema&apos;s own users table with bcrypt hashes — Supabase Auth is not involved.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
