import { describe, expect, it } from 'vitest';
import { removeCachedTask, type TaskCache } from '@/lib/taskCache';
import { errorMessage } from '@/lib/errorMessage';

describe('optimistic task cache', () => {
  it('removes a task from a later page without changing the rollback snapshot or cursors', () => {
    const first = { id: 'first', titulo: 'First', dataCriacao: '2026-11-08T12:00:00Z' };
    const second = { ...first, id: 'second', titulo: 'Second' };
    const cache: TaskCache = {
      pages: [
        { items: [first], total: 2, nextCursor: 2 },
        { items: [second], total: 2, nextCursor: null },
      ],
      pageParams: [undefined, 2],
    };
    const updated = removeCachedTask(cache, second.id);
    expect(updated.pages.map(page => page.items)).toEqual([[first], []]);
    expect(updated.pages.map(page => page.total)).toEqual([1, 1]);
    expect(updated.pageParams).toEqual([undefined, 2]);
    expect(updated.pages.map(page => page.nextCursor)).toEqual([2, null]);
    expect(cache.pages.map(page => page.items)).toEqual([[first], [second]]);
    expect(cache.pages.map(page => page.total)).toEqual([2, 2]);
  });
});

describe('error messages', () => {
  it('preserves useful server errors', () => {
    expect(errorMessage(new Error('Task not found.'))).toBe('Task not found.');
  });

  it.each([null, undefined, 'unknown failure', {}])('provides a readable fallback for %s', (error) => {
    expect(errorMessage(error)).toBe('Something went wrong. Please try again.');
  });
});
