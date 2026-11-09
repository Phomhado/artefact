import { afterEach, describe, expect, it } from 'vitest';
import { GET, POST } from '@/app/api/trpc/[trpc]/route';
import { taskStore } from '@/server/tasks';

afterEach(() => {
  for (const task of taskStore.list()) taskStore.delete(task.id);
});

function mutate(procedure: string, input: unknown) {
  return POST(new Request(`http://localhost/api/trpc/tasks.${procedure}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }));
}

describe('tRPC HTTP endpoint', () => {
  it('handles the full CRUD lifecycle through HTTP requests', async () => {
    const created = await mutate('create', { titulo: 'HTTP task' });
    expect(created.status).toBe(200);
    const { result: { data: task } } = await created.json();
    expect(task.titulo).toBe('HTTP task');

    const listed = await GET(new Request('http://localhost/api/trpc/tasks.list'));
    expect(listed.status).toBe(200);
    expect((await listed.json()).result.data.items).toEqual([task]);

    const updated = await mutate('update', { id: task.id, titulo: 'Updated over HTTP', descricao: 'Details' });
    expect(updated.status).toBe(200);
    expect((await updated.json()).result.data).toEqual({ ...task, titulo: 'Updated over HTTP', descricao: 'Details' });

    expect((await mutate('delete', { id: task.id })).status).toBe(200);
    const empty = await GET(new Request('http://localhost/api/trpc/tasks.list'));
    expect((await empty.json()).result.data).toEqual({ items: [], total: 0, nextCursor: null });
  });

  it('returns HTTP 400 for invalid input and HTTP 404 for missing tasks', async () => {
    const invalid = await mutate('create', { titulo: ' ' });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.data.code).toBe('BAD_REQUEST');
    const missing = await mutate('delete', { id: '00000000-0000-4000-8000-000000000001' });
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.message).toBe('Task not found.');
  });

  it('does not allow a GET request to create a task', async () => {
    const input = encodeURIComponent(JSON.stringify({ titulo: 'Should not exist' }));
    const response = await GET(new Request(`http://localhost/api/trpc/tasks.create?input=${input}`));
    expect(response.status).toBe(405);
    expect(taskStore.list()).toEqual([]);
  });
});
