import { DEFAULT_RULES } from '../constants/categories';
import type { Category, TransactionType } from '../types';

export interface CategorizationResult {
  category: Category;
  type: TransactionType;
}

/**
 * Categorize a transaction description using DEFAULT_RULES.
 * Matching is case-insensitive substring; first matching rule wins.
 * Fallback: { category: 'Other', type: 'expense' }
 *
 * NOTE: For 'Transfers' category rows, type is a placeholder — the user
 * must confirm income/expense in ImportSummaryModal before saving.
 */
export function categorize(description: string): CategorizationResult {
  const upper = description.toUpperCase();

  for (const rule of DEFAULT_RULES) {
    for (const keyword of rule.keywords) {
      if (upper.includes(keyword.toUpperCase())) {
        return { category: rule.category, type: rule.type };
      }
    }
  }

  return { category: 'Other', type: 'expense' };
}
