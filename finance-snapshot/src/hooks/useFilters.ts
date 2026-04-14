import { useAppDispatch, useAppState } from '../context/AppContext';
import type { Filters, Category, TransactionType } from '../types';

/**
 * Hook for reading and updating the shared filter state.
 * Filters live in AppContext so Dashboard and Transactions stay in sync.
 */
export function useFilters() {
  const { filters } = useAppState();
  const dispatch = useAppDispatch();

  function setMonth(month: string | null) {
    dispatch({ type: 'SET_FILTERS', payload: { selectedMonth: month } });
  }

  function setCategories(categories: Category[]) {
    dispatch({ type: 'SET_FILTERS', payload: { selectedCategories: categories } });
  }

  function setType(type: TransactionType | 'all') {
    dispatch({ type: 'SET_FILTERS', payload: { selectedType: type } });
  }

  function clearFilters() {
    dispatch({
      type: 'SET_FILTERS',
      payload: { selectedMonth: null, selectedCategories: [], selectedType: 'all' },
    });
  }

  return {
    filters,
    setMonth,
    setCategories,
    setType,
    clearFilters,
  } satisfies {
    filters: Filters;
    setMonth: (month: string | null) => void;
    setCategories: (categories: Category[]) => void;
    setType: (type: TransactionType | 'all') => void;
    clearFilters: () => void;
  };
}
