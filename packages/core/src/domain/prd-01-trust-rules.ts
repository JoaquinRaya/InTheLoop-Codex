export const prohibitedIdentityOrCorrelationKeys = [
  'employee_id',
  'user_id',
  'device_id',
  'session_id',
  'request_id',
  'submission_id',
  'tracking_id',
  'correlation_id',
  'ip',
  'ip_address'
] as const;

export type ProhibitedIdentityOrCorrelationKey =
  (typeof prohibitedIdentityOrCorrelationKeys)[number];

/**
 * isProhibitedIdentityOrCorrelationKey.
 */
export const isProhibitedIdentityOrCorrelationKey = (key: string): boolean =>
  prohibitedIdentityOrCorrelationKeys.some((prohibitedKey) => prohibitedKey === key);

export type ResponsePathLogEvent = Readonly<Record<string, string | number | boolean>>;

/**
 * redactResponsePathMetadata.
 */
export const redactResponsePathMetadata = (
  event: ResponsePathLogEvent
): ResponsePathLogEvent =>
  Object.keys(event).reduce<ResponsePathLogEvent>((accumulator, key) => {
    if (isProhibitedIdentityOrCorrelationKey(key)) {
      return accumulator;
    }

    const value = event[key]!;

    return {
      ...accumulator,
      [key]: value
    };
  }, {});
