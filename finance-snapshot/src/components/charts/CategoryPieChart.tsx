import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFilteredTransactions } from '../../context/AppContext';
import { CATEGORY_COLORS } from '../../constants/categories';
import type { Category } from '../../types';

const TOOLTIP_STYLE = {
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid #dde3ee',
  boxShadow: '0 4px 16px rgba(15,23,42,.10)',
};

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
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
        No expense data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="45%"
          innerRadius={62}
          outerRadius={90}
          paddingAngle={3}
        >
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CATEGORY_COLORS[entry.category as Category] ?? '#94a3b8'}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, undefined]}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
          iconSize={10}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
