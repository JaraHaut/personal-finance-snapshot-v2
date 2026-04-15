import { useAppDispatch, useAppState, showToast } from '../context/AppContext';
import { exportToPdf } from '../lib/pdf-export';

interface Props {
  pdfRef: React.RefObject<HTMLDivElement | null>;
  month: string | null;
}

/**
 * PDF export button. Locks UI during export via isExporting flag.
 * Captures the PdfSnapshot component (off-screen) — not the visible dashboard.
 */
export function ExportButton({ pdfRef, month }: Props) {
  const { isExporting, importPhase, transactions } = useAppState();
  const dispatch = useAppDispatch();

  const disabled = isExporting || importPhase !== 'idle' || transactions.length === 0;

  async function handleExport() {
    if (!pdfRef.current) return;
    dispatch({ type: 'SET_EXPORTING', payload: true });
    try {
      const slug    = month ?? 'all-time';
      const date    = new Date().toISOString().slice(0, 10);
      const filename = `finance-snapshot-${slug}-${date}.pdf`;
      await exportToPdf(pdfRef.current, filename);
      showToast('PDF exported!', 'success');
    } catch {
      showToast('PDF export failed.', 'error');
    } finally {
      dispatch({ type: 'SET_EXPORTING', payload: false });
    }
  }

  return (
    <button
      className="btn-secondary"
      onClick={handleExport}
      disabled={disabled}
      title={transactions.length === 0 ? 'Import data first' : 'Export PDF snapshot'}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span style={{ fontSize: 15 }}>⬇</span>
      {isExporting ? 'Exporting…' : 'Export PDF'}
    </button>
  );
}
