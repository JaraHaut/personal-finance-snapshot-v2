import { useState, useRef } from 'react';
import { useAppState, showToast } from '../context/AppContext';
import { ImportZone } from '../components/import/ImportZone';
import { ImportSummaryModal } from '../components/import/ImportSummaryModal';
import { MonthlyTotalsChart } from '../components/charts/MonthlyTotalsChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { CategoryTrendChart } from '../components/charts/CategoryTrendChart';
import { ExportButton } from '../components/ExportButton';
import { useAppDispatch } from '../context/AppContext';
import { finalizeImport } from '../lib/import-pipeline';
import type { ImportPipelineResult, FinalizeImportParams } from '../lib/import-pipeline';

export function Dashboard() {
  const { transactions, importPhase } = useAppState();
  const dispatch = useAppDispatch();
  const snapshotRef = useRef<HTMLDivElement>(null);

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

  // Summary stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Dashboard</h1>
        <ExportButton snapshotRef={snapshotRef} />
      </div>

      {/* Import zone */}
      {importPhase === 'idle' && (
        <div style={{ marginBottom: 24 }}>
          <ImportZone onPipelineResult={handlePipelineResult} />
        </div>
      )}

      {/* Snapshot area for PDF capture */}
      <div ref={snapshotRef}>
        {transactions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No data yet</div>
            <div style={{ fontSize: 13 }}>Drop a CSV file above to get started.</div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <SummaryCard label="Total Income" value={totalIncome} color="var(--color-success)" />
              <SummaryCard label="Total Expenses" value={totalExpense} color="var(--color-danger)" />
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
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Monthly Totals</div>
                <MonthlyTotalsChart />
              </div>
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Spending by Category</div>
                <CategoryPieChart />
              </div>
            </div>
            <div className="card">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Category Trends</div>
              <CategoryTrendChart />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  prefix = '',
  abs = false,
}: {
  label: string;
  value: number;
  color: string;
  prefix?: string;
  abs?: boolean;
}) {
  const display = abs ? Math.abs(value) : value;
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>
        {prefix}${display.toFixed(2)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
