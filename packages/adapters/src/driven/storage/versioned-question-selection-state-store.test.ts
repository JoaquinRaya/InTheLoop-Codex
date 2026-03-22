import { describe, expect, it } from 'vitest';
import { createVersionedQuestionSelectionStateStore } from './versioned-question-selection-state-store.js';

describe('createVersionedQuestionSelectionStateStore', () => {
  it('loads empty state by default and persists versioned updates', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string): string | null => memory.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        memory.set(key, value);
      }
    };

    const store = createVersionedQuestionSelectionStateStore(storage, 'qs');
    const loaded = store.loadState('tenant-a');

    expect(loaded.version).toBe(0);
    expect(loaded.state.consumedQueueQuestionIds).toEqual([]);

    const save = store.saveState(
      'tenant-a',
      { consumedQueueQuestionIds: ['q-1'] },
      loaded.version
    );

    expect(save._tag).toBe('Right');

    const reloaded = store.loadState('tenant-a');
    expect(reloaded.version).toBe(1);
    expect(reloaded.state.consumedQueueQuestionIds).toEqual(['q-1']);
  });

  it('returns VERSION_CONFLICT when expected version is stale', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string): string | null => memory.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        memory.set(key, value);
      }
    };

    const store = createVersionedQuestionSelectionStateStore(storage, 'qs');

    const first = store.loadState('tenant-a');
    store.saveState('tenant-a', { consumedQueueQuestionIds: ['q-1'] }, first.version);

    const staleWrite = store.saveState('tenant-a', { consumedQueueQuestionIds: ['q-1', 'q-2'] }, first.version);

    expect(staleWrite).toEqual({ _tag: 'Left', left: 'VERSION_CONFLICT' });
  });
});
