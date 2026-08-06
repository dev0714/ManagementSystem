import { ModuleTabs } from '@/components/shell/ModuleTabs';
import { requireModule } from '@/lib/auth';
import { moduleTabs } from '@/lib/nav';

export const dynamic = 'force-dynamic';

export default async function PropertyLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireModule('prop');
  return (
    <>
      <ModuleTabs tabs={moduleTabs('prop', role)} />
      {children}
    </>
  );
}
