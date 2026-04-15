import { useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { useAppDispatch, useAppState, showToast } from '../../context/AppContext';
import { runImportPipeline } from '../../lib/import-pipeline';
import { StorageFullError } from '../../lib/storage';
import type { ImportPipelineResult } from '../../lib/import-pipeline';

interface ImportZoneProps {
  onPipelineResult: (result: ImportPipelineResult, file: File) => void;
}

/**
 * CSV drag-and-drop + file picker zone.
 * Enforces the import state machine — ignores drops/clicks when phase !== 'idle'.
 * File size is validated before parsing (max 10MB).
 */
export function ImportZone({ onPipelineResult }: ImportZoneProps) {
  const dispatch = useAppDispatch();
  const { importPhase, transactions, isExporting } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);

  const isDisabled = importPhase !== 'idle' || isExporting;

  const handleFile = useCallback(
    async (file: File) => {
      const validExt = file.name.toLowerCase().endsWith('.csv');
      const validMime = !file.type || file.type === 'text/csv' || file.type === 'text/plain';
      if (!validExt || !validMime) {
        showToast('Please select a CSV file (.csv).', 'error');
        return;
      }

      dispatch({ type: 'SET_IMPORT_PHASE', payload: 'reading' });

      try {
        const result = await runImportPipeline(file, transactions);
        dispatch({ type: 'SET_IMPORT_PHASE', payload: 'confirming' });
        onPipelineResult(result, file);
      } catch (err) {
        dispatch({ type: 'SET_IMPORT_PHASE', payload: 'idle' });
        if (err instanceof StorageFullError) {
          showToast(err.message, 'error');
        } else {
          showToast(err instanceof Error ? err.message : 'Import failed.', 'error');
        }
      }
    },
    [dispatch, transactions, onPipelineResult]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isDisabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [isDisabled, handleFile]
  );

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  const loading = importPhase === 'reading';

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={() => !isDisabled && inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDisabled ? 'var(--color-border)' : 'var(--color-primary)'}`,
        borderRadius: 'var(--radius)',
        padding: '32px 24px',
        textAlign: 'center',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        background: isDisabled ? 'var(--color-bg)' : 'rgba(99,102,241,0.03)',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'border-color 0.15s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={onFileChange}
        disabled={isDisabled}
      />
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Parsing CSV…</p>
      ) : (
        <>
          <p style={{ margin: '0 0 6px', fontWeight: 500 }}>
            Drop a CSV file here
          </p>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 12 }}>
            or click to browse — max 10MB
          </p>
        </>
      )}
    </div>
  );
}
