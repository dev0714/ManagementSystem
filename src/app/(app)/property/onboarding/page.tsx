import Link from 'next/link';
import { revalidatePath } from 'next/cache';

import { SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** The six-step wizard from the design. Field lists drive both the form and the lease merge. */
const STEPS: { title: string; hint: string; fields: [string, boolean?][] }[] = [
  {
    title: 'Property & lease',
    hint: 'Where the tenant is moving in and for how long.',
    fields: [
      ['Province'],
      ['City'],
      ['Suburb'],
      ['Full physical address', true],
      ['Lease start'],
      ['Lease end'],
      ['Monthly rent'],
      ['Deposit'],
    ],
  },
  {
    title: 'Personal details',
    hint: 'Captured once and reused on every document and reminder.',
    fields: [
      ['Name'],
      ['Surname'],
      ['Contact number'],
      ['WhatsApp number'],
      ['Email address'],
      ['Birthday'],
      ['Festive holidays celebrated', true],
    ],
  },
  {
    title: 'Employment & financial',
    hint: 'Used for affordability checks and the lease annexure.',
    fields: [
      ['Place of work'],
      ['Position'],
      ['Work contact number'],
      ['Work email'],
      ['Gross monthly income'],
      ['Bank statement (3 months)'],
    ],
  },
  {
    title: 'Identification & address',
    hint: 'Verified against the Home Affairs copy on file.',
    fields: [
      ['ID / passport number'],
      ['Document type'],
      ['ID / passport copy'],
      ['Proof of physical address'],
      ['Previous address', true],
    ],
  },
  {
    title: 'Emergency contacts',
    hint: 'Next of kin reached only in an emergency.',
    fields: [['Full name'], ['Relationship'], ['Contact number'], ['Alternative number'], ['Email address'], ['Physical address']],
  },
  {
    title: 'Review & lease',
    hint: 'Everything below flows straight into the lease template.',
    fields: [
      ['Tenant'],
      ['Property'],
      ['Lease term'],
      ['Monthly rent (review)'],
      ['Documents complete'],
      ['Lease template'],
    ],
  },
];

async function saveStepAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('prop', ['admin']);
  const id = String(formData.get('id') ?? '');
  const stepIndex = Number(formData.get('step') ?? 0);
  if (!id) return;

  const client = db();
  const { data: app } = await client
    .from('onboarding_applications')
    .select('data')
    .eq('id', id)
    .eq('tenant_id', session.tenantId)
    .maybeSingle();
  if (!app) return;

  const merged = { ...((app.data as Record<string, string>) ?? {}) };
  for (const [label] of STEPS[stepIndex]?.fields ?? []) {
    const value = formData.get(`f:${label}`);
    if (value !== null) merged[label] = String(value);
  }

  const last = stepIndex >= STEPS.length - 1;
  await client
    .from('onboarding_applications')
    .update({
      data: merged,
      current_step: last ? stepIndex : stepIndex + 1,
      status: last ? 'Complete' : 'In progress',
    })
    .eq('id', id)
    .eq('tenant_id', session.tenantId);

  if (last) {
    await client.from('activity_events').insert({
      tenant_id: session.tenantId,
      module: 'prop',
      severity: 'success',
      title: `Onboarding completed — ${merged['Tenant'] ?? ''}`,
      who: session.name,
      actor_id: session.userId,
    });
  }

  revalidatePath('/property/onboarding');
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; id?: string }> }) {
  const { session } = await requireModule('prop', ['admin']);
  const sp = await searchParams;
  const client = db();

  const { data: apps } = await client
    .from('onboarding_applications')
    .select('id, applicant, property_label, current_step, status, data')
    .eq('tenant_id', session.tenantId)
    .order('created_at');

  const list = apps ?? [];
  const app = (sp.id ? list.find((a) => a.id === sp.id) : list[0]) ?? null;

  if (!app) {
    return (
      <div className="page">
        <SectionCard>
          <div className="empty">No onboarding applications in progress.</div>
        </SectionCard>
      </div>
    );
  }

  const stepIndex = Math.min(
    STEPS.length - 1,
    Math.max(0, sp.step !== undefined ? Number(sp.step) : (app.current_step as number)),
  );
  const step = STEPS[stepIndex];
  const data = (app.data as Record<string, string>) ?? {};

  const leaseSteps: [string, string, 'ok' | 'warn' | 'grey'][] = [
    ['Template selected', data['Lease template'] ?? 'Residential — 6 month', 'ok'],
    ['Fields merged', `${Object.keys(data).length} of ${STEPS.reduce((s, x) => s + x.fields.length, 0)}`, 'ok'],
    ['Tenant signature', app.status === 'Complete' ? 'Sent' : 'Awaiting', 'warn'],
    ['Landlord signature', 'Queued', 'grey'],
  ];

  return (
    <div className="page">
      <div className="grid" style={{ gridTemplateColumns: '260px 1fr 300px', alignItems: 'start' }}>
        <SectionCard title="Steps" subtitle={app.applicant as string}>
          <div className="stack" style={{ gap: 4 }}>
            {STEPS.map((s, i) => (
              <Link
                key={s.title}
                href={`/property/onboarding?id=${app.id}&step=${i}`}
                className="navitem"
                style={{
                  color: i === stepIndex ? 'var(--primary-deep)' : 'var(--text-muted)',
                  background: i === stepIndex ? '#EAF3FF' : 'transparent',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    flex: 'none',
                    background: i < (app.current_step as number) ? '#28A745' : i === stepIndex ? '#007BFF' : '#E8EDF3',
                    color: i <= stepIndex || i < (app.current_step as number) ? '#fff' : '#8494A7',
                  }}
                >
                  {i < (app.current_step as number) ? '✓' : i + 1}
                </span>
                <span style={{ flex: 1 }}>{s.title}</span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={step.title} subtitle={step.hint}>
          <form action={saveStepAction} className="stack" style={{ gap: 14 }}>
            <input type="hidden" name="id" value={app.id as string} />
            <input type="hidden" name="step" value={stepIndex} />

            <div className="grid grid--2" style={{ gap: 12 }}>
              {step.fields.map(([label, wide]) => (
                <div key={label} style={wide ? { gridColumn: 'span 2' } : undefined}>
                  <label className="label" htmlFor={`f:${label}`}>
                    {label}
                  </label>
                  <input
                    id={`f:${label}`}
                    name={`f:${label}`}
                    className="input"
                    defaultValue={data[label] ?? ''}
                    style={
                      data[label] === 'Outstanding'
                        ? { borderColor: '#F3C3C8', background: '#FEF6F5', color: '#C0392B' }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>

            <button type="submit" className="btn">
              {stepIndex === STEPS.length - 1 ? 'Complete onboarding' : 'Save & continue'}
            </button>
          </form>
        </SectionCard>

        <div className="stack" style={{ gap: 18 }}>
          <SectionCard title="Lease generation">
            <div className="stack">
              {leaseSteps.map(([label, value, tone]) => (
                <div className="row" key={label}>
                  <span style={{ flex: 1, fontSize: 12.5 }}>{label}</span>
                  <StatusPill tone={tone}>{value}</StatusPill>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Uploads">
            <div className="stack">
              {[
                ['🪪', 'ID / passport copy', data['ID / passport copy']],
                ['🏠', 'Proof of physical address', data['Proof of physical address']],
                ['🏦', 'Bank statement — 3 months', data['Bank statement (3 months)']],
              ].map(([icon, label, value]) => {
                const outstanding = !value || value === 'Outstanding';
                return (
                  <div className="row" key={label as string}>
                    <span aria-hidden>{icon}</span>
                    <span style={{ flex: 1, fontSize: 12.5 }}>{label}</span>
                    <StatusPill tone={outstanding ? 'bad' : 'ok'}>{outstanding ? 'Outstanding' : 'Received'}</StatusPill>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
