import { ModuleTabs } from '@/components/shell/ModuleTabs';
import { requireModule } from '@/lib/auth';
import { moduleTabs } from '@/lib/nav';

export const dynamic = 'force-dynamic';

export default async function FleetLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireModule('fleet');
  return (
    <>
      <ModuleTabs tabs={moduleTabs('fleet', role)} />
      {children}
    </>
  );
}
