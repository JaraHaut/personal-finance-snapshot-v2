import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAppState } from '../../context/AppContext';

/**
 * Monthly income vs expense bar chart.
 */
export function MonthlyTotalsChart() {
  const { transactions } = useAppState();

  const data = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      const month = tx.date.slice(0, 7); // YYYY-MM
      const entry = map.get(month) ?? { income: 0, expense: 0 };
      if (tx.type === 'income') entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(month, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({
        month,
        Income: Math.round(vals.income * 100) / 100,
        Expense: Math.round(vals.expense * 100) / 100,
      }));
  }, [transactions]);

  if (data.length === 0) {
    return <EmptyChart label="No data yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Income" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Expense" fill="var(--color-danger)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
      {label}
    </div>
  );
}
