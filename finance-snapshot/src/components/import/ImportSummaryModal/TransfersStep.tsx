import type { TransferRow, TransactionType } from '../../../types';

interface Props {
  transfers: TransferRow[];
  onChange: (t: TransferRow[]) => void;
}

export function TransfersStep({ transfers, onChange }: Props) {
  function setType(index: number, type: TransactionType) {
    const updated = transfers.map((t, i) =>
      i === index ? { ...t, chosenType: type } : t
    );
    onChange(updated);
  }

  return (
    <div>
      <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        These transactions look like transfers. Choose whether each is <strong>Income</strong> or an <strong>Expense</strong>.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {transfers.map((t, i) => (
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
              <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.row.description || '(no description)'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {t.row.date} · ${t.row.amount.toFixed(2)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {(['income', 'expense'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setType(i, type)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: `2px solid ${t.chosenType === type ? (type === 'income' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)'}`,
                    background: t.chosenType === type ? (type === 'income' ? '#dcfce7' : '#fee2e2') : 'var(--color-surface)',
                    color: t.chosenType === type ? (type === 'income' ? '#166534' : '#991b1b') : 'var(--color-text-muted)',
                    fontWeight: t.chosenType === type ? 600 : 400,
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!transfers.every(t => t.chosenType !== null) && (
        <p style={{ marginTop: 10, color: 'var(--color-warning)', fontSize: 12 }}>
          Please classify all transfers to continue.
        </p>
      )}
    </div>
  );
}
