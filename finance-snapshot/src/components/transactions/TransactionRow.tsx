import { useState } from 'react';
import type { Transaction, Category } from '../../types';
import { CATEGORIES, categoryBadgeStyle } from '../../constants/categories';
import { useAppDispatch } from '../../context/AppContext';

interface Props {
  transaction: Transaction;
  style?: React.CSSProperties;
}

/**
 * Single virtualized row. Clicking category badge opens an inline select.
 */
export function TransactionRow({ transaction: tx, style }: Props) {
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState(false);

  const amountColor = tx.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)';
  const amountSign = tx.type === 'income' ? '+' : '−';

  function handleCategoryChange(category: Category) {
    dispatch({ type: 'OVERRIDE_CATEGORY', payload: { transactionId: tx.id, category } });
    setEditing(false);
  }

  return (
    <div
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: '100px 1fr 140px 90px',
        gap: 12,
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 13,
        background: 'var(--color-surface)',
      }}
    >
      {/* Date */}
      <span style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {tx.date}
      </span>

      {/* Description */}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
        {tx.description || '(no description)'}
      </span>

      {/* Category — click to edit */}
      <span>
        {editing ? (
          <select
            autoFocus
            value={tx.category}
            onBlur={() => setEditing(false)}
            onChange={(e) => handleCategoryChange(e.target.value as Category)}
            style={{ fontSize: 12, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--color-border)' }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <span
            className="badge"
            onClick={() => setEditing(true)}
            title="Click to change category"
            style={{ cursor: 'pointer', ...categoryBadgeStyle(tx.category) }}
          >
            {tx.category}
            {tx.isManualCategory && ' ✎'}
          </span>
        )}
      </span>

      {/* Amount */}
      <span style={{ textAlign: 'right', fontWeight: 500, color: amountColor, fontVariantNumeric: 'tabular-nums' }}>
        {amountSign}${tx.amount.toFixed(2)}
      </span>
    </div>
  );
}

/** Column headers with matching grid layout. */
export function TransactionTableHeader() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 140px 90px',
        gap: 12,
        padding: '10px 16px',
        borderBottom: '2px solid var(--color-border)',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: 'var(--color-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      <span>Date</span>
      <span>Description</span>
      <span>Category</span>
      <span style={{ textAlign: 'right' }}>Amount</span>
    </div>
  );
}
