import type { DuplicateRow } from '../../../types';

interface Props {
  duplicates: DuplicateRow[];
  decisions: Record<number, 'keep' | 'skip'>;
  onChange: (d: Record<number, 'keep' | 'skip'>) => void;
}

export function DuplicatesStep({ duplicates, decisions, onChange }: Props) {
  function toggle(i: number, decision: 'keep' | 'skip') {
    onChange({ ...decisions, [i]: decision });
  }

  return (
    <div>
      <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        These rows already exist. Choose whether to add them again.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {duplicates.map((dup, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>
                {dup.incoming.description || '(no description)'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {dup.incoming.date} · ${dup.incoming.amount.toFixed(2)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => toggle(i, 'skip')}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: `2px solid ${decisions[i] === 'skip' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: decisions[i] === 'skip' ? 'rgba(99,102,241,0.1)' : 'var(--color-surface)',
                  color: decisions[i] === 'skip' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: 12,
                }}
              >
                Skip
              </button>
              <button
                onClick={() => toggle(i, 'keep')}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: `2px solid ${decisions[i] === 'keep' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: decisions[i] === 'keep' ? 'rgba(99,102,241,0.1)' : 'var(--color-surface)',
                  color: decisions[i] === 'keep' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: 12,
                }}
              >
                Add anyway
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
