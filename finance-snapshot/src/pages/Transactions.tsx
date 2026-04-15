import { TransactionTable } from '../components/transactions/TransactionTable';

export function Transactions() {
  return (
    <div>
      <h1 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Transactions</h1>
      <TransactionTable />
    </div>
  );
}
