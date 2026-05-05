interface Props {
  label: string;
  onChange: (s: string) => void;
  validCount: number;
  skippedCount: number;
  fileName: string;
}

export function LabelStep({ label, onChange, validCount, skippedCount, fileName }: Props) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-success)' }}>{validCount}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Transactions to import</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-warning)' }}>{skippedCount}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Rows skipped</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        File: {fileName}
      </div>
      <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
        Import name
      </label>
      <input
        type="text"
        value={label}
        onChange={(e) => onChange(e.target.value)}
        placeholder='e.g. "January 2026"'
        style={{ width: '100%' }}
        autoFocus
      />
      {!label.trim() && (
        <p style={{ margin: '6px 0 0', color: 'var(--color-danger)', fontSize: 12 }}>
          Name is required.
        </p>
      )}
    </div>
  );
}
