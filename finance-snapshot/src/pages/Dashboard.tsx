import { useState, useRef } from 'react';
import { useAppState, showToast, useAppDispatch } from '../context/AppContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ImportZone } from '../components/import/ImportZone';
import { ImportSummaryModal } from '../components/import/ImportSummaryModal';
import { MonthlyTotalsChart } from '../components/charts/MonthlyTotalsChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { CategoryTrendChart } from '../components/charts/CategoryTrendChart';
import { ExportButton } from '../components/ExportButton';
import { PdfSnapshot } from '../components/PdfSnapshot';
import { finalizeImport } from '../lib/import-pipeline';
import type { ImportPipelineResult, FinalizeImportParams } from '../lib/import-pipeline';

const CHART_HEADING: React.CSSProperties = {
  fontWeight: 650,
  fontSize: 15,
  letterSpacing: '-0.02em',
  marginBottom: 16,
  color: 'var(--color-text)',
};

export function Dashboard() {
  const { transactions, importPhase, filters } = useAppState();
  const dispatch = useAppDispatch();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [pendingResult, setPendingResult] = useState<{ result: ImportPipelineResult; file: File } | null>(null);

  function handlePipelineResult(result: ImportPipelineResult, file: File) {
    setPendingResult({ result, file });
  }

  function handleConfirm(params: Omit<FinalizeImportParams, 'fileName'>) {
    if (!pendingResult) return;
    const { file, transactions: newTxs } = finalizeImport({
      ...params,
      fileName: pendingResult.file.name,
    });
    dispatch({ type: 'ADD_IMPORT', payload: { file, transactions: newTxs } });
    dispatch({ type: 'SET_IMPORT_PHASE', payload: 'idle' });
    setPendingResult(null);
    showToast(`Imported "${params.label}" — ${newTxs.length} transactions.`, 'success');
  }

  function handleCancel() {
    setPendingResult(null);
    dispatch({ type: 'SET_IMPORT_PHASE', payload: 'idle' });
  }

  // Summary stats (all transactions — dashboard shows the global picture)
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  return (
    <div>
      {pendingResult && (
        <ImportSummaryModal
          result={pendingResult.result}
          fileName={pendingResult.file.name}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Dashboard</h1>
        <ExportButton pdfRef={pdfRef} month={filters.selectedMonth} />
      </div>

      {importPhase === 'idle' && (
        <div style={{ marginBottom: 28 }}>
          <ImportZone onPipelineResult={handlePipelineResult} />
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 56, color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 52, marginBottom: 18, opacity: 0.5 }}>📊</div>
          <div style={{ fontSize: 17, fontWeight: 650, marginBottom: 8, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
            No data yet
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Drop a CSV file above to get started.</div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <SummaryCard label="Total Income"   value={totalIncome}   color="var(--color-success)" />
            <SummaryCard label="Total Expenses" value={totalExpense}  color="var(--color-danger)" />
            <SummaryCard
              label="Net"
              value={net}
              color={net >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
              prefix={net >= 0 ? '+' : '−'}
              abs
            />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <div style={CHART_HEADING}>Monthly Totals</div>
              <MonthlyTotalsChart />
            </div>
            <div className="card">
              <div style={CHART_HEADING}>Spending by Category</div>
              <CategoryPieChart />
            </div>
          </div>
          <div className="card">
            <div style={CHART_HEADING}>Category Trends</div>
            <CategoryTrendChart />
          </div>
        </>
      )}

      {/* Off-screen PDF snapshot — always mounted so Recharts has layout dimensions */}
      <ErrorBoundary fallback={null}>
        <div
          aria-hidden
          style={{ position: 'absolute', left: -9999, top: 0, pointerEvents: 'none', zIndex: -1 }}
        >
          <PdfSnapshot ref={pdfRef} transactions={transactions} month={filters.selectedMonth} />
        </div>
      </ErrorBoundary>
    </div>
  );
}

function SummaryCard({
  label, value, color, prefix = '', abs = false,
}: {
  label: string;
  value: number;
  color: string;
  prefix?: string;
  abs?: boolean;
}) {
  const display = abs ? Math.abs(value) : value;
  return (
    <div className="card" style={{ textAlign: 'center', padding: '22px 16px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
        {prefix}${display.toFixed(2)}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );
}
