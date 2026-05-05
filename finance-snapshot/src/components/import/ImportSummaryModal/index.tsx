import { useState } from 'react';
import type { DuplicateRow, ParsedRow, TransferRow } from '../../../types';
import type { ImportPipelineResult } from '../../../lib/import-pipeline';
import { SkippedStep } from './SkippedStep';
import { TransfersStep } from './TransfersStep';
import { DuplicatesStep } from './DuplicatesStep';
import { LabelStep } from './LabelStep';

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

  const [transfers, setTransfers] = useState<TransferRow[]>(result.transfers);
  const [dupDecisions, setDupDecisions] = useState<Record<number, 'keep' | 'skip'>>({});
  const [label, setLabel] = useState(() => fileName.replace(/\.csv$/i, '').slice(0, 40));

  const isLastStep = stepIdx === steps.length - 1;

  function canProceed(): boolean {
    if (currentStep === 'transfers') return transfers.every((t) => t.chosenType !== null);
    if (currentStep === 'label') return label.trim().length > 0;
    return true;
  }

  function handleConfirm() {
    const acceptedDuplicates = result.duplicates.filter((_, i) => dupDecisions[i] === 'keep');
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
          {currentStep === 'skipped' && <SkippedStep skipped={result.skipped} />}
          {currentStep === 'transfers' && <TransfersStep transfers={transfers} onChange={setTransfers} />}
          {currentStep === 'duplicates' && <DuplicatesStep duplicates={result.duplicates} decisions={dupDecisions} onChange={setDupDecisions} />}
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
            <button className="btn-primary" onClick={() => setStepIdx(i => i + 1)} disabled={!canProceed()}>
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
