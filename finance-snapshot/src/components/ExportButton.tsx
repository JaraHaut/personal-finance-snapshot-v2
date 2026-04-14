import { useAppDispatch, useAppState } from '../context/AppContext';
import { exportToPdf } from '../lib/pdf-export';
import { showToast } from '../context/AppContext';

interface Props {
  snapshotRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * PDF export button. Locks UI during export via isExporting flag.
 */
export function ExportButton({ snapshotRef }: Props) {
  const { isExporting, importPhase, transactions } = useAppState();
  const dispatch = useAppDispatch();

  const disabled = isExporting || importPhase !== 'idle' || transactions.length === 0;

  async function handleExport() {
    if (!snapshotRef.current) return;
    dispatch({ type: 'SET_EXPORTING', payload: true });
    try {
      await exportToPdf(snapshotRef.current, `finance-snapshot-${new Date().toISOString().slice(0, 10)}.pdf`);
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
    >
      {isExporting ? 'Exporting…' : '⬇ Export PDF'}
    </button>
  );
}
