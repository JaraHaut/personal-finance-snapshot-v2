import { useAppState, useAppDispatch, useAvailableMonths } from '../../context/AppContext';
import { CATEGORIES } from '../../constants/categories';
import type { Category, TransactionType } from '../../types';

/**
 * Filter bar: month picker, category dropdown, type toggle.
 * Uses Filters shape: { selectedMonth, selectedCategories, selectedType }
 */
export function TableFilters() {
  const { filters } = useAppState();
  const dispatch = useAppDispatch();
  const months = useAvailableMonths();

  // Single-category selection: store as array of 0 or 1 items
  const selectedCategory = filters.selectedCategories[0] ?? null;
  const selectedType = filters.selectedType === 'all' ? null : filters.selectedType;

  function setMonth(month: string | null) {
    dispatch({ type: 'SET_FILTERS', payload: { selectedMonth: month } });
  }

  function setCategory(category: Category | null) {
    dispatch({ type: 'SET_FILTERS', payload: { selectedCategories: category ? [category] : [] } });
  }

  function setType(type: TransactionType | null) {
    dispatch({ type: 'SET_FILTERS', payload: { selectedType: type ?? 'all' } });
  }

  const hasFilters = filters.selectedMonth || selectedCategory || selectedType;

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
      {/* Month */}
      <select
        value={filters.selectedMonth ?? ''}
        onChange={(e) => setMonth(e.target.value || null)}
        style={{ fontSize: 13, padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
      >
        <option value="">All months</option>
        {months.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* Category */}
      <select
        value={selectedCategory ?? ''}
        onChange={(e) => setCategory((e.target.value as Category) || null)}
        style={{ fontSize: 13, padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Type */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['income', 'expense'] as TransactionType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(selectedType === t ? null : t)}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius)',
              border: `2px solid ${selectedType === t ? (t === 'income' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)'}`,
              background: selectedType === t ? (t === 'income' ? '#dcfce7' : '#fee2e2') : 'var(--color-surface)',
              color: selectedType === t ? (t === 'income' ? '#166534' : '#991b1b') : 'var(--color-text-muted)',
              fontSize: 12,
              fontWeight: selectedType === t ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          className="btn-secondary"
          onClick={() => dispatch({ type: 'SET_FILTERS', payload: { selectedMonth: null, selectedCategories: [], selectedType: 'all' } })}
          style={{ fontSize: 12, padding: '4px 10px' }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
