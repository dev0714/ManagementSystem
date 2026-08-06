'use client';

import { useState } from 'react';

import { submitChecklistAction } from './actions';

export type Item = { id: string; label: string };
type Mark = 'pass' | 'fail';

export function ChecklistForm({ items, templateId, prayer }: { items: Item[]; templateId: string; prayer: string }) {
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const answered = items.filter((i) => marks[i.id]).length;
  const allAnswered = answered === items.length && items.length > 0;
  const failures = items.filter((i) => marks[i.id] === 'fail').length;

  return (
    <form action={submitChecklistAction} className="stack" style={{ gap: 10 }}>
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="prayer" value={prayer} />
      {items.map((i) => (
        <input key={i.id} type="hidden" name={`item:${i.id}`} value={marks[i.id] ?? ''} />
      ))}

      <div className="row">
        <span className="tile__label">Readiness checklist</span>
        <div className="spacer" />
        <span className="num muted">
          {answered} / {items.length}
        </span>
      </div>

      {items.map((i) => {
        const mark = marks[i.id];
        return (
          <div key={i.id} className="checkrow" data-checked={mark === 'pass' ? 'true' : 'false'}>
            <span style={{ flex: 1 }}>{i.label}</span>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setMarks((m) => ({ ...m, [i.id]: 'pass' }))}
                style={
                  mark === 'pass'
                    ? { background: '#28A745' }
                    : { background: '#fff', color: 'var(--text-muted)', border: '1px solid var(--control-border)' }
                }
                aria-pressed={mark === 'pass'}
              >
                Pass
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setMarks((m) => ({ ...m, [i.id]: 'fail' }))}
                style={
                  mark === 'fail'
                    ? { background: '#DC3545' }
                    : { background: '#fff', color: 'var(--text-muted)', border: '1px solid var(--control-border)' }
                }
                aria-pressed={mark === 'fail'}
              >
                Fail
              </button>
            </div>
          </div>
        );
      })}

      <button type="submit" className="btn" disabled={!allAnswered}>
        {allAnswered ? 'Submit readiness checklist' : `Mark all ${items.length} items`}
      </button>
      <p className="muted" style={{ margin: 0 }}>
        {failures
          ? `${failures} failed item${failures === 1 ? '' : 's'} will open a maintenance job for HQ Repairs.`
          : 'A failed item opens a maintenance job for HQ Repairs automatically.'}
      </p>
    </form>
  );
}
