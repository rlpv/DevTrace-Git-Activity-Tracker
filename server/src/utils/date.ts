import { DateFilter, DateWindow } from '../types.js';

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function resolveDateWindow(dateFilter: DateFilter): DateWindow {
  if (dateFilter.mode === 'specific') {
    const specific = parseDate(dateFilter.specificDate);
    if (!specific) {
      return {};
    }
    return {
      since: toIso(startOfDay(specific)),
      until: toIso(endOfDay(specific)),
    };
  }

  const start = parseDate(dateFilter.startDate);
  const end = parseDate(dateFilter.endDate);
  return {
    since: start ? toIso(startOfDay(start)) : undefined,
    until: end ? toIso(endOfDay(end)) : undefined,
  };
}