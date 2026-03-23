import { describe, expect, it } from 'vitest';
import { buildStrongAnonymityDisclosure } from './prd-10-strong-anonymity.js';

describe('buildStrongAnonymityDisclosure', () => {
  it('returns explicit computational guarantee language with visible trust assumptions', () => {
    const disclosure = buildStrongAnonymityDisclosure();

    expect(disclosure.guaranteeStatement).toContain('computationally infeasible');
    expect(disclosure.trustAssumptions).toHaveLength(3);
    expect(disclosure.trustAssumptions[0]).toContain('Client runtime integrity');
  });
});
