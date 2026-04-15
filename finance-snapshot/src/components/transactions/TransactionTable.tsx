import { useFilteredTransactions } from '../../context/AppContext';
import { TableFilters } from './TableFilters';
import { TransactionRow, TransactionTableHeader } from './TransactionRow';

/**
 * Transaction table with a fixed-height scrollable body.
 * Renders all rows directly — no virtualizer needed at typical import sizes.
 */
export function TransactionTable() {
  const transactions = useFilteredTransactions();

  if (transactions.length === 0) {
    return (
      <div>
        <TableFilters />
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>No transactions</div>
          <div style={{ fontSize: 13 }}>Import a CSV file to get started.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TableFilters />
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <TransactionTableHeader />
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))}
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
