import type { SkippedRow } from '../../../types';

function skippedReason(reason: SkippedRow['reason']): string {
  const map: Record<SkippedRow['reason'], string> = {
    missing_date: 'Missing date',
    invalid_date_format: 'Unrecognized date format',
    missing_amount: 'Missing amount',
    non_numeric_amount: 'Non-numeric amount',
    empty_row: 'Empty row',
  };
  return map[reason];
}

export function SkippedStep({ skipped }: { skipped: SkippedRow[] }) {
  return (
    <div>
      <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        {skipped.length} row{skipped.length !== 1 ? 's' : ''} could not be parsed and will be skipped.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {skipped.map((row) => (
          <div
            key={row.rowNumber}
            style={{
              padding: '8px 12px',
              background: '#fef9c3',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius)',
              fontSize: 12,
            }}
          >
            <strong>Row {row.rowNumber}:</strong> {skippedReason(row.reason)}
            <div style={{ color: '#78716c', marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>
              {row.rawLine.slice(0, 80)}{row.rawLine.length > 80 ? '…' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
