import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useFilteredTransactions } from '../../context/AppContext';
import { CHART_TICK, CHART_GRID, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme';

export function MonthlyTotalsChart() {
  const transactions = useFilteredTransactions();

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
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="month" tick={CHART_TICK} tickLine={false} axisLine={false} dy={6} />
        <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
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
