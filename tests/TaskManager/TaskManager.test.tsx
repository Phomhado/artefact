// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task, TaskPage } from '@/server/tasks';
import { TaskManager } from '@/components/TaskManager';
import { TaskCard } from '@/components/TaskCard';
import { LoadMoreTasks } from '@/components/LoadMoreTasks';

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

const clients: QueryClient[] = [];

function renderManager(initialPage = firstPage) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><TaskManager initialPage={initialPage} /></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
    this.querySelector<HTMLInputElement>('input')?.focus();
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  api.list.mockResolvedValue(firstPage);
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});

describe('task flow edge cases', () => {
  it('uses the server-rendered tasks without an immediate duplicate request', () => {
    renderManager();
    expect(screen.getByRole('heading', { name: task.titulo })).toBeTruthy();
    expect(api.list).not.toHaveBeenCalled();
  });

  it('opens creation from the empty state', () => {
    renderManager({ items: [], total: 0, nextCursor: null });
    expect(screen.getByRole('heading', { name: 'No tasks' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeTruthy();
  });

  it('rejects whitespace-only titles locally and focuses the title', () => {
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    const title = screen.getByLabelText('Task title Required');
    fireEvent.change(title, { target: { value: '   ' } });
    fireEvent.submit(title.closest('form')!);
    expect(screen.getByRole('alert').textContent).toBe('Enter a title.');
    expect(document.activeElement).toBe(title);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('trims submitted fields and can recover from a failed save', async () => {
    api.create.mockRejectedValueOnce(new Error('Offline.')).mockResolvedValueOnce(task);
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    const title = screen.getByLabelText('Task title Required');
    fireEvent.change(title, { target: { value: '  Retry me  ' } });
    fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: '  Details  ' } });
    fireEvent.submit(title.closest('form')!);
    await screen.findByRole('alert');
    await waitFor(() => expect(title.matches(':disabled')).toBe(false));
    fireEvent.submit(title.closest('form')!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(api.create).toHaveBeenLastCalledWith({ titulo: 'Retry me', descricao: 'Details', id: undefined });
  });

  it('preserves the original task and edited draft if updating fails', async () => {
    api.update.mockRejectedValue(new Error('Update failed.'));
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Review notes' }));
    const title = screen.getByLabelText('Task title Required') as HTMLInputElement;
    fireEvent.change(title, { target: { value: 'Unsaved changes' } });
    fireEvent.submit(title.closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toContain('Update failed.');
    expect(title.value).toBe('Unsaved changes');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: task.titulo })).toBeTruthy();
  });

  it('loads the next page using its cursor and stops when all tasks are loaded', async () => {
    api.list.mockResolvedValue({ items: [{ ...task, id: 'task-2', titulo: 'Older task' }], total: 2, nextCursor: null });
    renderManager({ ...firstPage, total: 2, nextCursor: 42 });
    fireEvent.click(screen.getByRole('button', { name: 'Load more tasks' }));
    await screen.findByRole('heading', { name: 'Older task' });
    expect(api.list).toHaveBeenCalledWith({ limit: 10, cursor: 42 });
    expect(screen.getByRole('heading', { name: task.titulo })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Load more tasks' })).toBeNull();
  });

  it('keeps loaded tasks when the next page fails and supports retry', async () => {
    api.list.mockRejectedValueOnce(new Error('Offline.')).mockResolvedValueOnce({ items: [], total: 1, nextCursor: null });
    renderManager({ ...firstPage, nextCursor: 42 });
    fireEvent.click(screen.getByRole('button', { name: 'Load more tasks' }));
    await screen.findByText('Could not load more tasks. Please try again.');
    expect(screen.getByRole('heading', { name: task.titulo })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByText('Could not load more tasks. Please try again.')).toBeNull());
    expect(api.list).toHaveBeenCalledTimes(2);
  });
});

describe('optimistic deletion', () => {
  it('hides the task immediately and restores it with an error if deletion fails', async () => {
    const request = deferred<{ id: string }>();
    api.delete.mockReturnValue(request.promise);
    const client = renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review notes' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Review notes' })).toBeNull());
    expect(screen.getByRole('status').textContent).toContain('Task deleted.');
    expect(screen.getByRole('heading', { name: 'All tasks 0' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'No tasks' })).toBeTruthy();

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

describe('task modal', () => {
  it('opens creation with focus in the title, then closes after saving', async () => {
    const request = deferred<Task>();
    api.create.mockReturnValue(request.promise);
    const client = renderManager();
    const opener = screen.getByRole('button', { name: 'New task' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'New task' });
    const title = screen.getByLabelText('Task title Required') as HTMLInputElement;
    expect(document.activeElement).toBe(title);
    const closeButton = screen.getByRole('button', { name: 'Close dialog' });
    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    const submitButton = screen.getByRole('button', { name: 'Create task' });
    expect(document.activeElement).toBe(submitButton);
    fireEvent.keyDown(submitButton, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);
    fireEvent.change(title, { target: { value: 'New task with details' } });
    fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'First line\nSecond line' } });
    fireEvent.submit(title.closest('form')!);
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ titulo: 'New task with details', descricao: 'First line\nSecond line', id: undefined }));
    await waitFor(() => expect(title.matches(':disabled')).toBe(true));
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { request.resolve({ ...task, id: 'new-1' }); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
    client.clear();
  });

  it('keeps the modal and entered values when saving fails', async () => {
    const request = deferred<Task>();
    api.create.mockReturnValue(request.promise);
    const client = renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    const title = screen.getByLabelText('Task title Required') as HTMLInputElement;
    fireEvent.change(title, { target: { value: 'Keep my draft' } });
    fireEvent.submit(title.closest('form')!);
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    await act(async () => { request.reject(new Error('Offline.')); });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Offline.'));
    expect(title.value).toBe('Keep my draft');
    expect(title.disabled).toBe(false);
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeTruthy();
    client.clear();
  });

  it('opens editing with existing values and saves the correct task', async () => {
    api.update.mockResolvedValue({ ...task, titulo: 'Updated notes' });
    const client = renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Review notes' }));
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeTruthy();
    const title = screen.getByLabelText('Task title Required') as HTMLInputElement;
    const description = screen.getByLabelText('Description (optional)') as HTMLTextAreaElement;
    expect(title.value).toBe(task.titulo);
    expect(description.value).toBe(task.descricao);
    fireEvent.change(title, { target: { value: 'Updated notes' } });
    fireEvent.submit(title.closest('form')!);
    await waitFor(() => expect(api.update).toHaveBeenCalledWith({ id: task.id, titulo: 'Updated notes', descricao: task.descricao }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    client.clear();
  });

  it('supports Cancel and Escape without sending a request', () => {
    const client = renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.create).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('');
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
