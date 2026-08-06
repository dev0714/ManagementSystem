'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { saveRecord, deleteRecord, type CrudState } from '@/app/(app)/crud-actions';
import type { Field } from '@/lib/crud';

export type RefOption = { id: string; label: string };

function Submit({ label, variant = '' }: { label: string; variant?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn--sm ${variant}`} disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

function Input({ field, value, refs }: { field: Field; value: unknown; refs: Record<string, RefOption[]> }) {
  const id = `${field.name}-${Math.random().toString(36).slice(2, 8)}`;
  const common = { id, name: field.name, className: 'input', required: 'required' in field ? field.required : false };

  if (field.type === 'bool') {
    return (
      <label className="row" style={{ gap: 8, padding: '10px 0' }}>
        <input type="checkbox" name={field.name} defaultChecked={Boolean(value)} />
        <span style={{ fontSize: 13 }}>{field.label}</span>
      </label>
    );
  }

  return (
    <div style={field.wide ? { gridColumn: 'span 2' } : undefined}>
      <label className="label" htmlFor={id}>
        {field.label}
        {'required' in field && field.required ? ' *' : ''}
      </label>

      {field.type === 'select' ? (
        <select {...common} defaultValue={value == null ? '' : String(value)}>
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === 'ref' ? (
        <select {...common} defaultValue={value == null ? '' : String(value)}>
          <option value="">—</option>
          {(refs[field.name] ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea {...common} rows={3} defaultValue={value == null ? '' : String(value)} placeholder={field.placeholder} />
      ) : (
        <input
          {...common}
          type={field.type === 'password' ? 'password' : field.type === 'number' || field.type === 'money' ? 'number' : 'text'}
          step={field.type === 'money' ? '0.01' : undefined}
          autoComplete={field.type === 'password' ? 'new-password' : 'off'}
          defaultValue={field.type === 'password' ? '' : value == null ? '' : String(value)}
          placeholder={field.placeholder}
        />
      )}
    </div>
  );
}

export function RecordForm({
  resource,
  fields,
  values = {},
  refs = {},
  id,
  submitLabel,
  onDoneLabel,
}: {
  resource: string;
  fields: Field[];
  values?: Record<string, unknown>;
  refs?: Record<string, RefOption[]>;
  id?: string;
  submitLabel: string;
  onDoneLabel?: string;
}) {
  const [state, action] = useActionState<CrudState, FormData>(saveRecord, {});

  return (
    <form action={action} className="stack" style={{ gap: 12 }}>
      <input type="hidden" name="__resource" value={resource} />
      {id ? <input type="hidden" name="__id" value={id} /> : null}

      {state.error ? (
        <div className="banner banner--bad" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="banner banner--ok" role="status">
          {onDoneLabel ?? state.ok}
        </div>
      ) : null}

      <div className="grid grid--2" style={{ gap: 12 }}>
        {fields.map((f) => (
          <Input key={f.name} field={f} value={values[f.name]} refs={refs} />
        ))}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Submit label={submitLabel} />
      </div>
    </form>
  );
}

export function DeleteRecordButton({
  resource,
  id,
  name,
  label = 'Delete',
}: {
  resource: string;
  id: string;
  name: string;
  label?: string;
}) {
  const [state, action] = useActionState<CrudState, FormData>(deleteRecord, {});

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete “${name}”? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="__resource" value={resource} />
      <input type="hidden" name="__id" value={id} />
      <Submit label={label} variant="btn--ghost" />
      {state.error ? (
        <div className="banner banner--bad" style={{ marginTop: 6 }} role="alert">
          {state.error}
        </div>
      ) : null}
    </form>
  );
}
