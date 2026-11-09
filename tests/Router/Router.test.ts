import { afterEach, describe, expect, it } from 'vitest';
import { appRouter } from '@/server/router';
import { taskStore } from '@/server/tasks';

afterEach(() => {
  for (const task of taskStore.list()) taskStore.delete(task.id);
});

describe('task procedures', () => {
  const caller = appRouter.createCaller({});

  it('creates unique tasks, lists them, updates without changing identity, and deletes', async () => {
    const first = await caller.tasks.create({ titulo: '  First  ', descricao: '  Details  ' });
    const second = await caller.tasks.create({ titulo: 'Second' });
    expect(first).toMatchObject({ titulo: 'First', descricao: 'Details' });
    expect(first.id).not.toBe(second.id);
    expect(first.id).toMatch(/^[\da-f-]{36}$/);
    expect(await caller.tasks.list()).toEqual({ items: [second, first], total: 2, nextCursor: null });
    expect(await caller.tasks.update({ id: first.id, titulo: 'Edited', descricao: '' }))
      .toEqual({ ...first, titulo: 'Edited', descricao: '' });
    expect(await caller.tasks.delete({ id: first.id })).toEqual({ id: first.id });
    expect((await caller.tasks.list()).items).toEqual([second]);
  });

  it.each([
    { titulo: '' },
    { titulo: ' \n\t ' },
    { titulo: 'a'.repeat(121) },
    { titulo: 'Valid', descricao: 'a'.repeat(2001) },
  ])('rejects invalid create and update input without changing stored data: %o', async (input) => {
    const original = await caller.tasks.create({ titulo: 'Original' });
    await expect(caller.tasks.create(input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.tasks.update({ ...input, id: original.id })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect((await caller.tasks.list()).items).toEqual([original]);
  });

  it('accepts the exact length limits and optional descriptions', async () => {
    const task = await caller.tasks.create({ titulo: 'a'.repeat(120), descricao: 'b'.repeat(2000) });
    expect(task.titulo).toHaveLength(120);
    expect(task.descricao).toHaveLength(2000);
    expect((await caller.tasks.create({ titulo: 'No description' })).descricao).toBeUndefined();
  });

  it('rejects malformed IDs and reports missing tasks, including repeated deletion', async () => {
    await expect(caller.tasks.update({ id: 'invalid', titulo: 'Title' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.tasks.delete({ id: 'invalid' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const task = await caller.tasks.create({ titulo: 'Temporary' });
    await caller.tasks.delete({ id: task.id });
    await expect(caller.tasks.delete({ id: task.id })).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Task not found.' });
    await expect(caller.tasks.update({ id: task.id, titulo: 'Missing' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('defaults to ten tasks and follows the cursor without duplicates', async () => {
    const created = [];
    for (let i = 0; i < 11; i++) created.push(await caller.tasks.create({ titulo: `Task ${i}` }));
    const first = await caller.tasks.list();
    expect(first.items).toHaveLength(10);
    expect(first.total).toBe(11);
    const last = await caller.tasks.list({ cursor: first.nextCursor! });
    expect([...first.items, ...last.items]).toEqual(created.reverse());
    expect(last.nextCursor).toBeNull();
  });
});

describe('task pagination input', () => {
  const caller = appRouter.createCaller({});

  it.each([
    { limit: 0 },
    { limit: 51 },
    { limit: 1.5 },
    { cursor: 0 },
    { cursor: -1 },
    { cursor: 1.5 },
  ])('rejects invalid page input %o', async (input) => {
    await expect(caller.tasks.list(input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
