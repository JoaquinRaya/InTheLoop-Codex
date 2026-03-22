import { describe, expect, it } from 'vitest';
import { validateResponsePayload } from './index.js';

describe('core package exports', () => {
  it('exports validateResponsePayload from index', () => {
    expect(typeof validateResponsePayload).toBe('function');
  });
});
