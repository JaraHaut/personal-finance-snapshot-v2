import { useAppDispatch, useImportsWithCount } from '../../context/AppContext';

/**
 * Sidebar list of named imports with transaction counts and delete actions.
 */
export function ImportsList() {
  const dispatch = useAppDispatch();
  const imports = useImportsWithCount();

  if (imports.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'center', paddingTop: 8 }}>
        No imports yet
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        Imports
      </div>
      {imports.map((imp) => (
        <div
          key={imp.id}
          style={{
            padding: '8px 10px',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
            <span style={{ fontWeight: 500, wordBreak: 'break-word', flex: 1 }}>
              {imp.label}
            </span>
            <button
              title="Delete import"
              onClick={() => {
                if (confirm(`Delete "${imp.label}" and all its transactions?`)) {
                  dispatch({ type: 'DELETE_IMPORT', payload: { importId: imp.id } });
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: '0 2px',
                lineHeight: 1,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ color: 'var(--color-text-muted)', marginTop: 3, display: 'flex', gap: 6 }}>
            <span>{imp.transactionCount} rows</span>
            {imp.skippedCount > 0 && (
              <span style={{ color: 'var(--color-warning)' }}>{imp.skippedCount} skipped</span>
            )}
          </div>
          <div style={{ color: 'var(--color-text-muted)', marginTop: 2, fontSize: 11 }}>
            {new Date(imp.importedAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}
