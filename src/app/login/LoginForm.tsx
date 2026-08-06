'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { StatusPill } from '@/components/ui';
import type { Tone } from '@/lib/types';

import { loginAction, type LoginState } from './actions';

export type DemoAccount = {
  email: string;
  name: string;
  initials: string;
  title: string;
  scope: string;
  scopeTone: Tone;
  tenantName: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in to my workspace'}
    </button>
  );
}

export function LoginForm({ accounts, demoPassword }: { accounts: DemoAccount[]; demoPassword: string | null }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState(accounts[0]?.email ?? '');
  const [password, setPassword] = useState(demoPassword ?? '');

  return (
    <form className="login__form" action={formAction}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.6px', color: 'var(--text-strong)' }}>Sign in</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 5 }}>Use your work account.</div>
      </div>

      {state.error ? (
        <div className="banner banner--bad" role="alert">
          {state.error}
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <SubmitButton />

      {accounts.length ? (
        <>
          <div className="login__divider">
            <span className="rule" />
            DEMO ACCOUNTS
            <span className="rule" />
          </div>

          <div className="login__accounts">
            {accounts.map((a) => (
              <button
                key={a.email}
                type="button"
                className="login__account"
                onClick={() => {
                  setEmail(a.email);
                  if (demoPassword) setPassword(demoPassword);
                }}
                style={email === a.email ? { borderColor: 'var(--primary)', background: '#F2F8FF' } : undefined}
              >
                <span
                  className="login__account-avatar"
                  style={email === a.email ? { background: 'var(--primary)', color: '#fff' } : undefined}
                >
                  {a.initials}
                </span>
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{a.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-meta)', marginTop: 1 }}>
                    {a.title} · {a.tenantName}
                  </span>
                </span>
                <StatusPill tone={a.scopeTone}>{a.scope}</StatusPill>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </form>
  );
}
