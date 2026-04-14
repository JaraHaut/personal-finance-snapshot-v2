import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAppState } from '../../context/AppContext';
import { CATEGORY_COLORS } from '../../constants/categories';

const TOP_N = 5; // Show only top N categories to keep chart readable

/**
 * Line chart: monthly expense per category (top N by total spend).
 */
export function CategoryTrendChart() {
  const { transactions } = useAppState();

  const { chartData, topCategories } = useMemo(() => {
    // Aggregate by month + category (expenses only)
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

    // Pick top N categories
    const topCategories = Array.from(catTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([cat]) => cat);

    // Build chart data rows
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
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
        No trend data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {topCategories.map((cat) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] ?? '#94a3b8'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
