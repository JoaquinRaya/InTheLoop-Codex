import { describe, expect, it } from 'vitest';
import { createBrowserLocalStateStore } from './browser-local-state-store.js';
import { createEmptyEmployeeClientLocalState } from '../../../../core/src/application/employee-daily-prompt.js';
import { some } from '../../../../core/src/domain/option.js';

describe('createBrowserLocalStateStore', () => {
  it('persists and restores employee prompt local state through storage', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string): string | null => memory.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        memory.set(key, value);
      }
    };

    const store = createBrowserLocalStateStore(storage, 'state-key');
    const state = {
      ...createEmptyEmployeeClientLocalState(),
      lastAnsweredDay: some('2026-03-22'),
      cachedProfile: some({
        managerEmail: 'mgr@example.com',
        role: 'engineer',
        level: 'l4'
      })
    };

    store.saveState(state);

    const reloaded = store.loadState();

    expect(reloaded.lastAnsweredDay._tag).toBe('Some');
    expect(reloaded.cachedProfile._tag).toBe('Some');

    if (reloaded.cachedProfile._tag === 'Some') {
      expect(reloaded.cachedProfile.value.managerEmail).toBe('mgr@example.com');
    }
  });

  it('returns empty state when storage has no value', () => {
    const storage = {
      getItem: (_key: string): string | null => null,
      setItem: (_key: string, _value: string): void => {}
    };

    const store = createBrowserLocalStateStore(storage);
    const loaded = store.loadState();

    expect(loaded.lastAnsweredDay._tag).toBe('None');
    expect(loaded.cachedProfile._tag).toBe('None');
  });
});
