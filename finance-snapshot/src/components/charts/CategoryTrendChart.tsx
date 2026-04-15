import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useFilteredTransactions } from '../../context/AppContext';
import { CATEGORY_COLORS } from '../../constants/categories';
import { CHART_TICK, CHART_GRID, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme';
import type { Category } from '../../types';

const TOP_N = 5;

export function CategoryTrendChart() {
  const transactions = useFilteredTransactions();

  const { chartData, topCategories } = useMemo(() => {
    const byMonthCat = new Map<string, Map<string, number>>();
    const catTotals = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const month = tx.date.slice(0, 7);
      if (!byMonthCat.has(month)) byMonthCat.set(month, new Map());
      const catMap = byMonthCat.get(month)!;
      catMap.set(tx.category, (catMap.get(tx.category) ?? 0) + tx.amount);
      catTotals.set(tx.category, (catTotals.get(tx.category) ?? 0) + tx.amount);
    }

    const topCategories = Array.from(catTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([cat]) => cat);

    const months = Array.from(byMonthCat.keys()).sort();
    const chartData = months.map((month) => {
      const catMap = byMonthCat.get(month)!;
      const row: Record<string, number | string> = { month };
      for (const cat of topCategories) {
        row[cat] = Math.round((catMap.get(cat) ?? 0) * 100) / 100;
      }
      return row;
    });

    return { chartData, topCategories };
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
        No trend data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="month" tick={CHART_TICK} tickLine={false} axisLine={false} dy={6} />
        <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, undefined]}
        />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} iconSize={10} iconType="circle" />
        {topCategories.map((cat) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={CATEGORY_COLORS[cat as Category] ?? '#94a3b8'}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
