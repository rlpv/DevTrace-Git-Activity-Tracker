import { DateFilterMode, SummaryStyle } from '../types/index.js';

export function summaryStyleLabel(style: SummaryStyle): string {
  if (style === 'short') {
    return 'Short';
  }
  if (style === 'professional') {
    return 'Professional';
  }
  if (style === 'detailed') {
    return 'Detailed';
  }
  return 'Standup-style';
}

export function dateModeLabel(mode: DateFilterMode): string {
  if (mode === 'specific') {
    return 'Specific date';
  }
  return 'Date range';
}