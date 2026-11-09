import { describe, expect, it } from 'vitest';
import { createTaskStore } from '@/server/tasks';

describe('task store', () => {
  it('creates, lists, updates, and deletes a task', () => {
    const store = createTaskStore();
    const task = store.create({ titulo: '  Prepare interview  ' });
    expect(task.titulo).toBe('Prepare interview');
    expect(Number.isNaN(Date.parse(task.dataCriacao))).toBe(false);
    expect(store.list()).toEqual([task]);
    const updated = store.update(task.id, { titulo: 'Review notes', descricao: 'Read the README' });
    expect(updated).toEqual({ ...task, titulo: 'Review notes', descricao: 'Read the README' });
    store.delete(task.id);
    expect(store.list()).toEqual([]);
  });

  it('rejects whitespace-only titles without changing the list', () => {
    const store = createTaskStore();
    expect(() => store.create({ titulo: '   ' })).toThrow();
    const task = store.create({ titulo: 'Valid title' });
    expect(() => store.update(task.id, { titulo: ' ' })).toThrow();
    expect(store.list()).toEqual([task]);
  });

  it('reports missing tasks when updating or deleting', () => {
    const store = createTaskStore();
    expect(() => store.update('missing', { titulo: 'Updated' })).toThrow('Task not found.');
    expect(() => store.delete('missing')).toThrow('Task not found.');
  });

  it('returns an empty page and stops at an exact page boundary', () => {
    const store = createTaskStore();
    expect(store.listPage(2)).toEqual({ items: [], nextCursor: null, total: 0 });

    const first = store.create({ titulo: 'First' });
    const second = store.create({ titulo: 'Second' });
    expect(store.listPage(2)).toEqual({ items: [second, first], nextCursor: null, total: 2 });
  });

  it('loads every task once in newest-first order', () => {
    const store = createTaskStore();
    const created = Array.from({ length: 5 }, (_, index) => store.create({ titulo: `Task ${index}` }));
    const first = store.listPage(2);
    const second = store.listPage(2, first.nextCursor!);
    const third = store.listPage(2, second.nextCursor!);

    expect([...first.items, ...second.items, ...third.items]).toEqual(created.reverse());
    expect(third.nextCursor).toBeNull();
    expect(third.total).toBe(5);
  });

  it('keeps the next page stable after insertion, editing, and cursor deletion', () => {
    const store = createTaskStore();
    const oldest = store.create({ titulo: 'Oldest' });
    const middle = store.create({ titulo: 'Middle' });
    store.create({ titulo: 'Newest' });
    const first = store.listPage(2);

    store.delete(middle.id);
    store.create({ titulo: 'Added between page requests' });
    const updated = store.update(oldest.id, { titulo: 'Edited oldest task' });

    expect(store.listPage(2, first.nextCursor!)).toEqual({
      items: [updated],
      nextCursor: null,
      total: 3,
    });
  });
});
