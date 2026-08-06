'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ModuleTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  if (tabs.length < 2) return null;

  return (
    <nav className="tabbar" aria-label="Module sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} data-active={pathname === t.href}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
