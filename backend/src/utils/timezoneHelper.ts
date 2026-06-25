/**
 * Timezone Helpers
 * 
 * Provides centralized logic for handling dates and times in the Africa/Cairo timezone.
 */

export function getCairoDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return { year, month, day };
}

export function isFutureCairoDay(dateToCheck: Date, referenceDate: Date = new Date()): boolean {
  const check = getCairoDateParts(dateToCheck);
  const ref = getCairoDateParts(referenceDate);

  return (
    check.year > ref.year ||
    (check.year === ref.year && check.month > ref.month) ||
    (check.year === ref.year && check.month === ref.month && check.day > ref.day)
  );
}

export function isDayBeforeOrEarlierCairo(dateToCheck: Date, referenceDate: Date = new Date()): boolean {
  const check = getCairoDateParts(dateToCheck);
  const ref = getCairoDateParts(referenceDate);

  return (
    ref.year < check.year ||
    (ref.year === check.year && ref.month < check.month) ||
    (ref.year === check.year && ref.month === check.month && ref.day < check.day)
  );
}
