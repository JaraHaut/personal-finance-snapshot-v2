import type React from 'react';
import type { Category, TransactionType } from '../types';

/** A rule that maps description keywords to a category and transaction type. */
export interface CategoryRule {
  /** Case-insensitive substring patterns matched against description. */
  keywords: string[];
  category: Category;
  type: TransactionType;
}

/**
 * Default categorization rules.
 * First matching rule wins — order matters.
 * Income and transfer rules are listed first to prevent mis-firing.
 */
export const DEFAULT_RULES: CategoryRule[] = [
  // Income — checked first so payroll/deposit never mis-fires as expense
  {
    keywords: ['DIRECT DEPOSIT', 'PAYROLL', 'PAYROLL CORRECTION', 'SALARY', 'ACH CREDIT'],
    category: 'Income',
    type: 'income',
  },
  // Refunds / credits — income type, Other category
  {
    keywords: ['REFUND', 'CASHBACK', 'INSURANCE REFUND'],
    category: 'Other',
    type: 'income',
  },
  // Credit card autopay — category: Transfers; type assigned by user in modal
  {
    keywords: ['CARD AUTOPAY', 'AUTOPAY', 'CARD PAYMENT'],
    category: 'Transfers',
    type: 'expense', // placeholder; user overrides in ImportSummaryModal
  },
  // Peer-to-peer transfers — category: Transfers; type assigned by user in modal
  {
    keywords: ['VENMO', 'ZELLE', 'CASH APP', 'CASHAPP'],
    category: 'Transfers',
    type: 'expense', // placeholder; user overrides in ImportSummaryModal
  },
  // Groceries
  {
    keywords: ['WHOLEFDS', 'WHOLE FOODS', 'TRADER JOE', 'SAFEWAY', 'KROGER', 'ALDI', 'COSTCO GROCERY'],
    category: 'Groceries',
    type: 'expense',
  },
  // Dining
  {
    keywords: [
      'CHIPOTLE', 'SWEETGREEN', 'STARBUCKS', 'BLUE BOTTLE', 'GOTHAM BAGELS',
      'MCDONALD', 'GRUBHUB', 'DOORDASH', 'UBEREATS', 'SEAMLESS',
    ],
    category: 'Dining',
    type: 'expense',
  },
  // Transport
  {
    keywords: ['LYFT', 'UBER* TRIP', 'UBER *TRIP', 'MTA NYCT', 'TRANSIT'],
    category: 'Transport',
    type: 'expense',
  },
  // Subscriptions
  {
    keywords: [
      'NETFLIX', 'SPOTIFY', 'HULU', 'OPENAI', 'CHATGPT', 'AMAZON PRIME',
      'APPLE.COM/BILL', 'GOOGLE ONE', 'DISNEY+',
    ],
    category: 'Subscriptions',
    type: 'expense',
  },
  // Utilities
  {
    keywords: ['CON EDISON', 'CONEDISON', 'PSEG', 'VERIZON', 'AT&T', 'COMCAST', 'SPECTRUM'],
    category: 'Utilities',
    type: 'expense',
  },
  // Shopping
  {
    keywords: ['AMZN MKTP', 'TARGET', 'WALMART', 'BESTBUY', 'COSTCO', 'ETSY'],
    category: 'Shopping',
    type: 'expense',
  },
  // Health
  {
    keywords: ['CVS', 'DUANE READE', 'WALGREENS', 'RITE AID', 'PHARMACY', 'DOCTOR', 'DENTIST', 'HOSPITAL', 'URGENT CARE'],
    category: 'Health',
    type: 'expense',
  },
  // Travel
  {
    keywords: ['DELTA', 'UNITED AIRLINES', 'AMERICAN AIR', 'HOTEL', 'MARRIOTT', 'HILTON', 'AIRBNB', 'BOOKING.COM', 'EXPEDIA'],
    category: 'Travel',
    type: 'expense',
  },
];

/** Ordered list of all 11 categories for dropdowns and filters. */
export const CATEGORIES: Category[] = [
  'Groceries',
  'Dining',
  'Transport',
  'Subscriptions',
  'Utilities',
  'Shopping',
  'Health',
  'Travel',
  'Income',
  'Transfers',
  'Other',
];

/**
 * Single source of truth for category colors.
 * Used in: table badges, pie chart slices, bar chart segments, trend lines, legends.
 */
export const CATEGORY_COLORS: Record<Category, string> = {
  Groceries:     '#22c55e',
  Dining:        '#f97316',
  Transport:     '#3b82f6',
  Subscriptions: '#8b5cf6',
  Utilities:     '#64748b',
  Shopping:      '#ec4899',
  Health:        '#06b6d4',
  Travel:        '#f59e0b',
  Income:        '#10b981',
  Transfers:     '#94a3b8',
  Other:         '#a16207',
};

/**
 * Returns inline style for a category badge.
 * All badge rendering should call this instead of hardcoding colors.
 */
export function categoryBadgeStyle(category: Category): React.CSSProperties {
  const color = CATEGORY_COLORS[category];
  return {
    background: `${color}1f`, // ~12% opacity tint
    color,
    border: `1px solid ${color}40`, // ~25% opacity border
  };
}
