import { describe, it, expect } from 'vitest';
import { categorize } from './categorizer';

describe('categorize', () => {
  it('fallback: unknown description → Other / expense', () => {
    expect(categorize('RANDOM STORE XYZ')).toEqual({ category: 'Other', type: 'expense' });
  });

  it('empty string → Other / expense', () => {
    expect(categorize('')).toEqual({ category: 'Other', type: 'expense' });
  });

  // Income
  it('DIRECT DEPOSIT → Income / income', () => {
    expect(categorize('DIRECT DEPOSIT - EMPLOYER')).toEqual({ category: 'Income', type: 'income' });
  });

  it('PAYROLL → Income / income (case-insensitive)', () => {
    expect(categorize('payroll jan 2026')).toEqual({ category: 'Income', type: 'income' });
  });

  it('REFUND → Other / income', () => {
    expect(categorize('AMAZON REFUND')).toEqual({ category: 'Other', type: 'income' });
  });

  // Transfers — first matching rule wins over later ones
  it('VENMO → Transfers', () => {
    expect(categorize('VENMO PAYMENT')).toEqual({ category: 'Transfers', type: 'expense' });
  });

  it('ZELLE → Transfers', () => {
    expect(categorize('ZELLE FROM JOHN')).toEqual({ category: 'Transfers', type: 'expense' });
  });

  it('AUTOPAY → Transfers (not Shopping)', () => {
    expect(categorize('CARD AUTOPAY CHASE')).toEqual({ category: 'Transfers', type: 'expense' });
  });

  // Groceries
  it('WHOLE FOODS → Groceries', () => {
    expect(categorize('WHOLE FOODS MARKET #123')).toEqual({ category: 'Groceries', type: 'expense' });
  });

  it('WHOLEFDS (abbreviated) → Groceries', () => {
    expect(categorize('WHOLEFDS NYC')).toEqual({ category: 'Groceries', type: 'expense' });
  });

  // Dining
  it('CHIPOTLE → Dining', () => {
    expect(categorize('CHIPOTLE MEXICAN GRILL')).toEqual({ category: 'Dining', type: 'expense' });
  });

  it('DOORDASH → Dining', () => {
    expect(categorize('DOORDASH*SUBWAY')).toEqual({ category: 'Dining', type: 'expense' });
  });

  // Transport
  it('LYFT → Transport', () => {
    expect(categorize('LYFT RIDE APR 30')).toEqual({ category: 'Transport', type: 'expense' });
  });

  it('MTA NYCT → Transport', () => {
    expect(categorize('MTA NYCT METROCARD')).toEqual({ category: 'Transport', type: 'expense' });
  });

  // Subscriptions
  it('NETFLIX → Subscriptions', () => {
    expect(categorize('NETFLIX.COM')).toEqual({ category: 'Subscriptions', type: 'expense' });
  });

  it('OPENAI → Subscriptions', () => {
    expect(categorize('OPENAI *CHATGPT PLUS')).toEqual({ category: 'Subscriptions', type: 'expense' });
  });

  // Utilities
  it('CON EDISON → Utilities', () => {
    expect(categorize('CON EDISON BILL')).toEqual({ category: 'Utilities', type: 'expense' });
  });

  // Shopping
  it('AMZN MKTP → Shopping', () => {
    expect(categorize('AMZN MKTP US*1A2B3C')).toEqual({ category: 'Shopping', type: 'expense' });
  });

  it('TARGET → Shopping', () => {
    expect(categorize('TARGET #0123')).toEqual({ category: 'Shopping', type: 'expense' });
  });

  // Health
  it('WALGREENS → Health', () => {
    expect(categorize('WALGREENS PHARMACY')).toEqual({ category: 'Health', type: 'expense' });
  });

  it('URGENT CARE → Health', () => {
    expect(categorize('URGENT CARE CENTER NYC')).toEqual({ category: 'Health', type: 'expense' });
  });

  // Travel
  it('AIRBNB → Travel', () => {
    expect(categorize('AIRBNB * LONDON')).toEqual({ category: 'Travel', type: 'expense' });
  });

  it('DELTA → Travel', () => {
    expect(categorize('DELTA AIR LINES')).toEqual({ category: 'Travel', type: 'expense' });
  });

  // Rule priority: income rules fire before expense rules
  it('COSTCO GROCERY → Groceries, not Shopping (keyword order)', () => {
    // COSTCO appears in both Shopping and Groceries; Groceries rule fires first
    expect(categorize('COSTCO GROCERY WAREHOUSE')).toEqual({ category: 'Groceries', type: 'expense' });
  });
});
