import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useAppState } from '../../context/AppContext';

const TICK = { fontSize: 13, fill: '#64748b' };
const GRID = { strokeDasharray: '4 4', stroke: '#e2e8f0' };
const TOOLTIP_STYLE = {
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid #dde3ee',
  boxShadow: '0 4px 16px rgba(15,23,42,.10)',
};

export function MonthlyTotalsChart() {
  const { transactions } = useAppState();

  const data = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      const month = tx.date.slice(0, 7);
      const entry = map.get(month) ?? { income: 0, expense: 0 };
      if (tx.type === 'income') entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(month, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        Income: Math.round(v.income * 100) / 100,
        Expense: Math.round(v.expense * 100) / 100,
      }));
  }, [transactions]);

  if (data.length === 0) {
    return <EmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} barCategoryGap="30%">
        <CartesianGrid {...GRID} />
        <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} dy={6} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, undefined]}
          cursor={{ fill: 'rgba(91,94,244,.06)' }}
        />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
        <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
      No data yet
    </div>
  );
}
