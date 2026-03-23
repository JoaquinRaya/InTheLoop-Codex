/**
 * Driven port for tenant working-day policy resolution.
 */
export type ForWorkCalendarPolicy = Readonly<{
  readonly isWorkingDay: (localDate: string, timeZone: string) => boolean;
}>;
