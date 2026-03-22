import { isProhibitedIdentityOrCorrelationKey } from '../../../../core/src/domain/prd-01-trust-rules.js';

export type LogPrimitiveValue = string | number | boolean;
export type LogValue = LogPrimitiveValue | ResponsePathLogEvent;

export interface ResponsePathLogEvent {
  readonly [key: string]: LogValue;
}

const denyPatternParts = ['ip', 'x_forwarded_for', 'forwarded', 'request_id', 'correlation_id'] as const;

const containsDeniedPattern = (key: string): boolean =>
  denyPatternParts.some((part) => key.toLowerCase().includes(part));

const sanitizeValue = (value: LogValue): LogValue => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return sanitizeResponsePathLogEvent(value);
};

export const sanitizeResponsePathLogEvent = (
  event: ResponsePathLogEvent
): ResponsePathLogEvent =>
  Object.keys(event).reduce<ResponsePathLogEvent>((accumulator, key) => {
    if (isProhibitedIdentityOrCorrelationKey(key) || containsDeniedPattern(key)) {
      return accumulator;
    }

    return {
      ...accumulator,
      [key]: sanitizeValue(event[key]!)
    };
  }, {});
