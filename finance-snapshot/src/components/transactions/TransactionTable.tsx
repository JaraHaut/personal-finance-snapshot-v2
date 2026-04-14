import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFilteredTransactions } from '../../context/AppContext';
import { TableFilters } from './TableFilters';
import { TransactionRow, TransactionTableHeader } from './TransactionRow';

const ROW_HEIGHT = 44;

/**
 * Virtualized transaction table using TanStack Virtual.
 * Renders only visible rows regardless of dataset size.
 */
export function TransactionTable() {
  const transactions = useFilteredTransactions();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

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
      <div
        className="card"
        style={{ overflow: 'hidden', padding: 0 }}
      >
        <TransactionTableHeader />
        {/* Scroll container */}
        <div
          ref={parentRef}
          style={{ height: Math.min(transactions.length * ROW_HEIGHT, 520), overflowY: 'auto' }}
        >
          {/* Total height for scrollbar */}
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => (
              <TransactionRow
                key={transactions[virtualRow.index].id}
                transaction={transactions[virtualRow.index]}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
