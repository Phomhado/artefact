// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task, TaskPage } from '@/server/tasks';
import { TaskManager } from './TaskManager';
import { TaskCard } from './TaskCard';
import { LoadMoreTasks } from './LoadMoreTasks';

const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: { tasks: {
    list: { query: api.list },
    create: { mutate: api.create },
    update: { mutate: api.update },
    delete: { mutate: api.delete },
  } },
}));

const task: Task = { id: 'task-1', titulo: 'Review notes', descricao: 'Read the brief', dataCriacao: '2026-11-08T12:00:00Z' };
const firstPage: TaskPage = { items: [task], total: 1, nextCursor: null };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><TaskManager initialPage={firstPage} /></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.list.mockResolvedValue(firstPage);
});

afterEach(cleanup);

describe('optimistic deletion', () => {
  it('hides the task immediately and restores it with an error if deletion fails', async () => {
    const request = deferred<{ id: string }>();
    api.delete.mockReturnValue(request.promise);
    const client = renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review notes' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Review notes' })).toBeNull());
    expect(screen.getByRole('status').textContent).toContain('Task deleted.');
    expect(screen.getByRole('heading', { name: 'All tasks 0' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'You’re all caught up!' })).toBeTruthy();

    await act(async () => { request.reject(new Error('Connection lost.')); });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Connection lost. The task has been restored.'));
    expect(screen.getByRole('heading', { name: 'Review notes' }).closest('li')?.classList.contains('restored')).toBe(true);
    expect(screen.getByRole('heading', { name: 'All tasks 1' })).toBeTruthy();
    client.clear();
  });

  it('keeps a successful deletion removed after refreshing', async () => {
    const request = deferred<{ id: string }>();
    api.delete.mockReturnValue(request.promise);
    api.list.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    const client = renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review notes' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Review notes' })).toBeNull());
    await act(async () => { request.resolve({ id: task.id }); });
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Review notes' })).toBeNull();
    client.clear();
  });
});

describe('rapid task creation', () => {
  it('clears and focuses the input while saving, without overwriting the next draft', async () => {
    const first = deferred<Task>();
    const second = deferred<Task>();
    api.create.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const client = renderManager();
    const title = screen.getByLabelText('Task title Required') as HTMLInputElement;
    const form = title.closest('form')!;

    fireEvent.change(title, { target: { value: 'First task' } });
    fireEvent.submit(form);
    expect(title.value).toBe('');
    expect(document.activeElement).toBe(title);
    expect(title.disabled).toBe(false);

    fireEvent.change(title, { target: { value: 'Second task' } });
    fireEvent.submit(form);
    fireEvent.change(title, { target: { value: 'Draft for later' } });
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));

    await act(async () => { first.resolve({ ...task, id: 'new-1', titulo: 'First task' }); });
    expect(title.value).toBe('Draft for later');
    await act(async () => { second.reject(new Error('Unable to connect.')); });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Could not save "Second task"'));
    expect(title.value).toBe('Draft for later');
    client.clear();
  });

  it('restores a failed submission when the user has not started another draft', async () => {
    const request = deferred<Task>();
    api.create.mockReturnValue(request.promise);
    const client = renderManager();
    const title = screen.getByLabelText('Task title Required') as HTMLInputElement;
    fireEvent.change(title, { target: { value: 'Keep my draft' } });
    fireEvent.submit(title.closest('form')!);
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    await act(async () => { request.reject(new Error('Offline.')); });
    await waitFor(() => expect(title.value).toBe('Keep my draft'));
    client.clear();
  });
});

it('reveals mobile actions with a horizontal swipe or the actions button', () => {
  render(<ul><TaskCard task={task} disabled={false} deleting={false} onEdit={vi.fn()} onDelete={vi.fn()} /></ul>);
  const card = screen.getByRole('listitem');
  const toggle = screen.getByRole('button', { name: 'Actions for Review notes' });
  fireEvent.touchStart(card, { touches: [{ clientX: 250, clientY: 100 }] });
  fireEvent.touchEnd(card, { changedTouches: [{ clientX: 245, clientY: 250 }] });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.touchStart(card, { touches: [{ clientX: 250, clientY: 100 }] });
  fireEvent.touchEnd(card, { changedTouches: [{ clientX: 100, clientY: 110 }] });
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

it('renders three skeleton cards while loading another page', () => {
  const { container } = render(<LoadMoreTasks hasMore loading error={false} disabled onLoadMore={vi.fn()} />);
  expect(screen.getByRole('status', { name: 'Loading more tasks' })).toBeTruthy();
  expect(container.querySelectorAll('.skeleton-card')).toHaveLength(3);
});
