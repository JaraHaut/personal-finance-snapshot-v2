import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFilteredTransactions } from '../../context/AppContext';
import { CATEGORY_COLORS } from '../../constants/categories';

/**
 * Donut chart of expense breakdown by category (filtered by current filters).
 */
export function CategoryPieChart() {
  const transactions = useFilteredTransactions();

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
        No expense data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CATEGORY_COLORS[entry.category as keyof typeof CATEGORY_COLORS] ?? '#94a3b8'}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => value}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
