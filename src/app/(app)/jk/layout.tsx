import { ModuleTabs } from '@/components/shell/ModuleTabs';
import { requireModule } from '@/lib/auth';
import { moduleTabs } from '@/lib/nav';

export const dynamic = 'force-dynamic';

export default async function JkLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireModule('jk');
  return (
    <>
      <ModuleTabs tabs={moduleTabs('jk', role)} />
      {children}
    </>
  );
}
