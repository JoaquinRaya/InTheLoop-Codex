import { describe, expect, it } from 'vitest';
import {
  isProhibitedIdentityOrCorrelationKey,
  prohibitedIdentityOrCorrelationKeys,
  redactResponsePathMetadata
} from './prd-01-trust-rules.js';

describe('prd-01 trust rules', () => {
  it('includes core prohibited identity/correlation keys', () => {
    expect(prohibitedIdentityOrCorrelationKeys).toContain('employee_id');
    expect(prohibitedIdentityOrCorrelationKeys).toContain('request_id');
    expect(prohibitedIdentityOrCorrelationKeys).toContain('ip_address');
  });

  it('identifies prohibited identity and correlator keys', () => {
    expect(isProhibitedIdentityOrCorrelationKey('device_id')).toBe(true);
    expect(isProhibitedIdentityOrCorrelationKey('question_id')).toBe(false);
  });

  it('redacts prohibited metadata from response-path log events', () => {
    const redacted = redactResponsePathMetadata({
      event_name: 'response_received',
      question_id: 'q-123',
      request_id: 'req-123',
      ip_address: '127.0.0.1',
      response_count: 10
    });

    expect(redacted).toEqual({
      event_name: 'response_received',
      question_id: 'q-123',
      response_count: 10
    });
  });
});
