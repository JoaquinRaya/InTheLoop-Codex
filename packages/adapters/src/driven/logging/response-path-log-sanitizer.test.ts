import { describe, expect, it } from 'vitest';
import { sanitizeResponsePathLogEvent } from './response-path-log-sanitizer.js';

describe('sanitizeResponsePathLogEvent', () => {
  it('removes ip-like and correlation metadata recursively from log events', () => {
    const sanitized = sanitizeResponsePathLogEvent({
      event_name: 'submission_received',
      ip_address: '10.0.0.1',
      request_id: 'req-1',
      nested: {
        x_forwarded_for: '10.0.0.2',
        correlation_id: 'corr-1',
        ok: 'safe'
      }
    });

    expect(sanitized).toEqual({
      event_name: 'submission_received',
      nested: {
        ok: 'safe'
      }
    });
  });
});
