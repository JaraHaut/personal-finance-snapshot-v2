import { useState } from 'react';
import type { SkippedRow, DuplicateRow, TransferRow, ParsedRow, TransactionType } from '../../types';
import type { ImportPipelineResult } from '../../lib/import-pipeline';

type Step = 'skipped' | 'transfers' | 'duplicates' | 'label';

interface Props {
  result: ImportPipelineResult;
  fileName: string;
  onConfirm: (params: {
    label: string;
    validRows: ParsedRow[];
    resolvedTransfers: TransferRow[];
    acceptedDuplicates: DuplicateRow[];
    skippedCount: number;
  }) => void;
  onCancel: () => void;
}

function getSteps(result: ImportPipelineResult): Step[] {
  const steps: Step[] = [];
  if (result.skipped.length > 0) steps.push('skipped');
  if (result.transfers.length > 0) steps.push('transfers');
  if (result.duplicates.length > 0) steps.push('duplicates');
  steps.push('label');
  return steps;
}

/** Reason label for skipped rows. */
function skippedReason(reason: SkippedRow['reason']): string {
  const map: Record<SkippedRow['reason'], string> = {
    missing_date: 'Missing date',
    invalid_date_format: 'Unrecognized date format',
    missing_amount: 'Missing amount',
    non_numeric_amount: 'Non-numeric amount',
    empty_row: 'Empty row',
  };
  return map[reason];
}

/**
 * Multi-step import summary modal:
 *   1. Review skipped rows (if any)
 *   2. Classify transfers: Income / Expense (if any)
 *   3. Resolve duplicates (if any)
 *   4. Name the import
 */
export function ImportSummaryModal({ result, fileName, onConfirm, onCancel }: Props) {
  const steps = getSteps(result);
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx];

  // Transfers state — user must choose income/expense for each
  const [transfers, setTransfers] = useState<TransferRow[]>(result.transfers);

  // Duplicate decisions: 'keep' | 'skip'
  const [dupDecisions, setDupDecisions] = useState<Record<number, 'keep' | 'skip'>>({});

  // Label state
  const [label, setLabel] = useState(() => {
    // Auto-suggest label from file name (strip .csv, format)
    return fileName.replace(/\.csv$/i, '').slice(0, 40);
  });

  const isLastStep = stepIdx === steps.length - 1;

  // Validate: all transfers must have a chosen type before proceeding
  const transfersResolved = transfers.every((t) => t.chosenType !== null);

  function next() {
    setStepIdx((i) => i + 1);
  }

  function canProceed(): boolean {
    if (currentStep === 'transfers') return transfersResolved;
    if (currentStep === 'label') return label.trim().length > 0;
    return true;
  }

  function handleConfirm() {
    const acceptedDuplicates = result.duplicates
      .filter((_, i) => dupDecisions[i] === 'keep');
    // Note: no .map() — we pass DuplicateRow[] directly so finalizeImport
    // can preserve isManualCategory from the existing transaction.

    onConfirm({
      label: label.trim(),
      validRows: result.valid,
      resolvedTransfers: transfers,
      acceptedDuplicates,
      skippedCount: result.skipped.length,
    });
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span>Import Summary</span>
          <button className="btn-secondary" onClick={onCancel} style={{ padding: '4px 10px' }}>
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
          {steps.map((step, i) => (
            <span
              key={step}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 9999,
                background: i === stepIdx ? 'var(--color-primary)' : i < stepIdx ? '#dcfce7' : 'var(--color-bg)',
                color: i === stepIdx ? '#fff' : i < stepIdx ? '#166534' : 'var(--color-text-muted)',
                fontWeight: 500,
              }}
            >
              {step === 'skipped' && `${result.skipped.length} Skipped`}
              {step === 'transfers' && `${result.transfers.length} Transfers`}
              {step === 'duplicates' && `${result.duplicates.length} Duplicates`}
              {step === 'label' && 'Name Import'}
            </span>
          ))}
        </div>

        <div className="modal-body">
          {currentStep === 'skipped' && (
            <SkippedStep skipped={result.skipped} />
          )}
          {currentStep === 'transfers' && (
            <TransfersStep
              transfers={transfers}
              onChange={setTransfers}
            />
          )}
          {currentStep === 'duplicates' && (
            <DuplicatesStep
              duplicates={result.duplicates}
              decisions={dupDecisions}
              onChange={setDupDecisions}
            />
          )}
          {currentStep === 'label' && (
            <LabelStep
              label={label}
              onChange={setLabel}
              validCount={result.valid.length + transfers.filter(t => t.chosenType !== null).length}
              skippedCount={result.skipped.length}
              fileName={fileName}
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          {!isLastStep && (
            <button className="btn-primary" onClick={next} disabled={!canProceed()}>
              Next →
            </button>
          )}
          {isLastStep && (
            <button className="btn-primary" onClick={handleConfirm} disabled={!canProceed()}>
              Save Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-step components ---

function SkippedStep({ skipped }: { skipped: SkippedRow[] }) {
  return (
    <div>
      <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        {skipped.length} row{skipped.length !== 1 ? 's' : ''} could not be parsed and will be skipped.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {skipped.map((row) => (
          <div
            key={row.rowNumber}
            style={{
              padding: '8px 12px',
              background: '#fef9c3',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius)',
              fontSize: 12,
            }}
          >
            <strong>Row {row.rowNumber}:</strong> {skippedReason(row.reason)}
            <div style={{ color: '#78716c', marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>
              {row.rawLine.slice(0, 80)}{row.rawLine.length > 80 ? '…' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransfersStep({
  transfers,
  onChange,
}: {
  transfers: TransferRow[];
  onChange: (t: TransferRow[]) => void;
}) {
  function setType(index: number, type: TransactionType) {
    const updated = transfers.map((t, i) =>
      i === index ? { ...t, chosenType: type } : t
    );
    onChange(updated);
  }

  return (
    <div>
      <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        These transactions look like transfers. Choose whether each is <strong>Income</strong> or an <strong>Expense</strong>.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {transfers.map((t, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.row.description || '(no description)'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {t.row.date} · ${t.row.amount.toFixed(2)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {(['income', 'expense'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setType(i, type)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: `2px solid ${t.chosenType === type ? (type === 'income' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)'}`,
                    background: t.chosenType === type ? (type === 'income' ? '#dcfce7' : '#fee2e2') : 'var(--color-surface)',
                    color: t.chosenType === type ? (type === 'income' ? '#166534' : '#991b1b') : 'var(--color-text-muted)',
                    fontWeight: t.chosenType === type ? 600 : 400,
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!transfers.every(t => t.chosenType !== null) && (
        <p style={{ marginTop: 10, color: 'var(--color-warning)', fontSize: 12 }}>
          Please classify all transfers to continue.
        </p>
      )}
    </div>
  );
}

function DuplicatesStep({
  duplicates,
  decisions,
  onChange,
}: {
  duplicates: DuplicateRow[];
  decisions: Record<number, 'keep' | 'skip'>;
  onChange: (d: Record<number, 'keep' | 'skip'>) => void;
}) {
  function toggle(i: number, decision: 'keep' | 'skip') {
    onChange({ ...decisions, [i]: decision });
  }

  return (
    <div>
      <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        These rows already exist. Choose whether to add them again.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {duplicates.map((dup, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>
                {dup.incoming.description || '(no description)'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {dup.incoming.date} · ${dup.incoming.amount.toFixed(2)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => toggle(i, 'skip')}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: `2px solid ${decisions[i] === 'skip' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: decisions[i] === 'skip' ? 'rgba(99,102,241,0.1)' : 'var(--color-surface)',
                  color: decisions[i] === 'skip' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: 12,
                }}
              >
                Skip
              </button>
              <button
                onClick={() => toggle(i, 'keep')}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: `2px solid ${decisions[i] === 'keep' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: decisions[i] === 'keep' ? 'rgba(99,102,241,0.1)' : 'var(--color-surface)',
                  color: decisions[i] === 'keep' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: 12,
                }}
              >
                Add anyway
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelStep({
  label,
  onChange,
  validCount,
  skippedCount,
  fileName,
}: {
  label: string;
  onChange: (s: string) => void;
  validCount: number;
  skippedCount: number;
  fileName: string;
}) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-success)' }}>{validCount}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Transactions to import</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-warning)' }}>{skippedCount}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Rows skipped</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        File: {fileName}
      </div>
      <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
        Import name
      </label>
      <input
        type="text"
        value={label}
        onChange={(e) => onChange(e.target.value)}
        placeholder='e.g. "January 2026"'
        style={{ width: '100%' }}
        autoFocus
      />
      {!label.trim() && (
        <p style={{ margin: '6px 0 0', color: 'var(--color-danger)', fontSize: 12 }}>
          Name is required.
        </p>
      )}
    </div>
  );
}
