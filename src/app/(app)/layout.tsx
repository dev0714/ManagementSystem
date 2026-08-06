import { Sidebar } from '@/components/shell/Sidebar';
import { TopBar } from '@/components/shell/TopBar';
import { requireSession } from '@/lib/auth';
import { navFor } from '@/lib/nav';
import { openAlertCount, openDealCount } from '@/lib/queries';

import { signOutAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Authoritative gate for every authenticated route. Pages nested below this
 * layout additionally assert their own module/role requirements.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [alerts, deals] = await Promise.all([openAlertCount(session.tenantId), openDealCount(session.tenantId)]);
  const groups = navFor(session, alerts, deals);

  return (
    <div className="shell">
      <Sidebar session={session} groups={groups} signOutAction={signOutAction} />
      <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar session={session} alertCount={alerts} />
        {children}
      </main>
    </div>
  );
}
