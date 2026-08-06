'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavGroup } from '@/lib/nav';
import type { Session } from '@/lib/types';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);
}

export function Sidebar({
  session,
  groups,
  signOutAction,
}: {
  session: Session;
  groups: NavGroup[];
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  // A nav item stays highlighted for any route inside its module.
  const moduleRoot = (href: string) => '/' + (href.split('/')[1] ?? '');
  const activeRoot = '/' + (pathname.split('/')[1] ?? '');

  return (
    <aside className="sidebar">
      <div className="sidebar__lockup">
        <div className="sidebar__mark">{session.tenant.monogram}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#fff' }}>{session.tenant.short_name}</div>
          <div style={{ fontSize: 10.5, color: '#7E93AB', letterSpacing: '.4px' }}>{session.tenant.tagline}</div>
        </div>
      </div>

      {groups.map((g) => (
        <nav className="navgroup" key={g.title} aria-label={g.title}>
          <div className="navgroup__title">{g.title}</div>
          {g.items.map((i) => {
            const active = i.href === '/' ? pathname === '/' : moduleRoot(i.href) === activeRoot || isActive(pathname, i.href);
            return (
              <Link key={i.href} href={i.href} className="navitem" data-active={active}>
                <span className="navitem__icon" aria-hidden>
                  {i.icon}
                </span>
                <span style={{ flex: 1 }}>{i.label}</span>
                {i.badge ? <span className="navitem__badge">{i.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
      ))}

      <div className="spacer" />

      <div className="sidebar__foot">
        <span className="sidebar__avatar">{session.initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#7E93AB',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.title}
          </div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="signout" title="Sign out" aria-label="Sign out">
            ⏻
          </button>
        </form>
      </div>
    </aside>
  );
}
