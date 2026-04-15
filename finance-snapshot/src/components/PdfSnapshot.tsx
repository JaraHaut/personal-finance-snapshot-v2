import { forwardRef, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import type { Transaction } from '../types';
import { CATEGORY_COLORS } from '../constants/categories';
import type { Category } from '../types';

// A4 portrait at screen resolution: 794px wide, padding 48px each side
const W = 794;
const PAD = 48;
const CONTENT_W = W - PAD * 2;

const FONT = "'Inter', system-ui, -apple-system, sans-serif";

interface Props {
  transactions: Transaction[]; // all transactions (for monthly totals + trend)
  month: string | null;        // selected month filter (null = all time)
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function monthRange(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last  = new Date(y, m, 0);
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', opts);
  return `${fmt(first, { month: 'short', day: 'numeric' })} – ${fmt(last, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function fullRange(txs: Transaction[]): string | null {
  if (txs.length === 0) return null;
  const dates = txs.map(t => t.date).sort();
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

const SECTION: React.CSSProperties = { marginBottom: 36 };
const HEADING: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#94a3b8',
  marginBottom: 14,
  paddingBottom: 8,
  borderBottom: '1px solid #e2e8f0',
};
const TICK = { fontSize: 12, fill: '#64748b' };
const GRID = { strokeDasharray: '4 4', stroke: '#e8edf4' };
const TT   = { fontSize: 12, borderRadius: 6, border: '1px solid #dde3ee' };

function StatBox({ label, value, color, sign = '' }: { label: string; value: number; color: string; sign?: string }) {
  return (
    <div style={{
      flex: 1,
      background: `${color}0f`,
      border: `1px solid ${color}33`,
      borderRadius: 10,
      padding: '14px 18px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {sign}{usd(value)}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ── PdfSnapshot ───────────────────────────────────────────────────────────── */

export const PdfSnapshot = forwardRef<HTMLDivElement, Props>(({ transactions, month }, ref) => {

  const filtered = useMemo(
    () => month ? transactions.filter(t => t.date.startsWith(month)) : transactions,
    [transactions, month],
  );

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  // Category breakdown (filtered, expenses only)
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of filtered) {
      if (tx.type !== 'expense') continue;
      map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([cat, total]) => ({ cat, total, pct: totalExpense > 0 ? (total / totalExpense) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, totalExpense]);

  // Monthly totals (ALL transactions)
  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      const m = tx.date.slice(0, 7);
      const e = map.get(m) ?? { income: 0, expense: 0 };
      if (tx.type === 'income') e.income += tx.amount; else e.expense += tx.amount;
      map.set(m, e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => ({
      month: m,
      Income:  Math.round(v.income  * 100) / 100,
      Expense: Math.round(v.expense * 100) / 100,
    }));
  }, [transactions]);

  // Trend (ALL transactions, top 5 expense categories)
  const { trendData, topCats } = useMemo(() => {
    const byMC = new Map<string, Map<string, number>>();
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const m = tx.date.slice(0, 7);
      if (!byMC.has(m)) byMC.set(m, new Map());
      const cm = byMC.get(m)!;
      cm.set(tx.category, (cm.get(tx.category) ?? 0) + tx.amount);
      totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
    }
    const topCats = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    const months  = Array.from(byMC.keys()).sort();
    const trendData = months.map(m => {
      const cm = byMC.get(m)!;
      const row: Record<string, number | string> = { month: m };
      for (const c of topCats) row[c] = Math.round((cm.get(c) ?? 0) * 100) / 100;
      return row;
    });
    return { trendData, topCats };
  }, [transactions]);

  const title    = month ? monthLabel(month) : 'All Time';
  const subtitle = month ? monthRange(month) : fullRange(transactions);
  const today    = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div
      ref={ref}
      style={{
        width: W,
        background: '#ffffff',
        fontFamily: FONT,
        color: '#0f172a',
        lineHeight: 1.55,
        padding: `${PAD}px`,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* ── Header ── */}
      <div style={SECTION}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5b5ef4', marginBottom: 8 }}>
          Finance Snapshot
        </div>
        <div style={{ fontSize: 30, fontWeight: 750, letterSpacing: '-0.03em', color: '#0f172a' }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{subtitle}</div>
        )}
        <div style={{ borderBottom: '2px solid #e2e8f0', marginTop: 20 }} />
      </div>

      {/* ── Summary ── */}
      <div style={SECTION}>
        <div style={HEADING}>Overview</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <StatBox label="Total Income"   value={totalIncome}          color="#10b981" />
          <StatBox label="Total Expenses" value={totalExpense}         color="#ef4444" />
          <StatBox label="Net"            value={Math.abs(net)}        color={net >= 0 ? '#10b981' : '#ef4444'} sign={net >= 0 ? '+' : '−'} />
        </div>
      </div>

      {/* ── Category breakdown ── */}
      {breakdown.length > 0 && (
        <div style={SECTION}>
          <div style={HEADING}>Category Breakdown</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left',  padding: '5px 0', color: '#94a3b8', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '5px 0', color: '#94a3b8', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                <th style={{ textAlign: 'right', padding: '5px 0', color: '#94a3b8', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>% of Expenses</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map(({ cat, total, pct }) => (
                <tr key={cat}>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: CATEGORY_COLORS[cat as Category] ?? '#94a3b8',
                      marginRight: 8, verticalAlign: 'middle',
                    }} />
                    {cat}
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f1f5f9' }}>
                    {usd(total)}
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                    {pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Monthly totals bar chart ── */}
      {monthlyData.length > 0 && (
        <div style={SECTION}>
          <div style={HEADING}>Monthly Totals</div>
          <BarChart width={CONTENT_W} height={200} data={monthlyData} margin={{ top: 4, right: 0, left: 8, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={56} />
            <Tooltip contentStyle={TT} formatter={(v) => [`$${Number(v).toFixed(2)}`, undefined]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Income"  fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </div>
      )}

      {/* ── Category donut ── */}
      {breakdown.length > 0 && (
        <div style={SECTION}>
          <div style={HEADING}>Spending by Category</div>
          <PieChart width={CONTENT_W} height={240}>
            <Pie
              data={breakdown.map(({ cat, total }) => ({ name: cat, value: total }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="48%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={3}
            >
              {breakdown.map(({ cat }) => (
                <Cell key={cat} fill={CATEGORY_COLORS[cat as Category] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip contentStyle={TT} formatter={(v) => [`$${Number(v).toFixed(2)}`, undefined]} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconSize={9} iconType="circle" />
          </PieChart>
        </div>
      )}

      {/* ── Category trend line ── */}
      {trendData.length > 0 && (
        <div style={SECTION}>
          <div style={HEADING}>Category Trends</div>
          <LineChart width={CONTENT_W} height={200} data={trendData} margin={{ top: 4, right: 0, left: 8, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={56} />
            <Tooltip contentStyle={TT} formatter={(v) => [`$${Number(v).toFixed(2)}`, undefined]} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconSize={9} iconType="circle" />
            {topCats.map(cat => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={CATEGORY_COLORS[cat as Category] ?? '#94a3b8'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        borderTop: '1px solid #e2e8f0',
        paddingTop: 14,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#94a3b8',
      }}>
        <span>Finance Snapshot</span>
        <span>Generated {today}</span>
      </div>
    </div>
  );
});

PdfSnapshot.displayName = 'PdfSnapshot';
