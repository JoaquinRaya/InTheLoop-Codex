/**
 * PRD-03 tenant calendar policy helpers.
 */
import type { Weekday } from './question-scheduling.js';
import type { ForWorkCalendarPolicy } from '../ports/driven/for-work-calendar-policy.js';

export type TenantCalendarConfiguration = Readonly<{
  readonly workingWeekdays: readonly Weekday[];
  readonly holidays: readonly string[];
}>;

/**
 * toSet.
 */
const toSet = <T>(values: readonly T[]): ReadonlySet<T> => new Set(values);

/**
 * weekdayFromIsoDate.
 */
const weekdayFromIsoDate = (localDate: string): Weekday => {
  const weekday = new Date(`${localDate}T00:00:00.000Z`).getUTCDay();
  return weekday as Weekday;
};

/**
 * Creates a tenant-configurable work calendar policy with explicit weekend/holiday handling.
 */
export const createTenantWorkCalendarPolicy = (
  configuration: TenantCalendarConfiguration
): ForWorkCalendarPolicy => {
  const workingWeekdays = toSet(configuration.workingWeekdays);
  const holidays = toSet(configuration.holidays);

  return {
    isWorkingDay: (localDate) => workingWeekdays.has(weekdayFromIsoDate(localDate)) && !holidays.has(localDate)
  };
};
