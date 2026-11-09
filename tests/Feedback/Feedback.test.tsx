// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '@/components/Toast';
import { LoadMoreTasks } from '@/components/LoadMoreTasks';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('notifications', () => {
  it.each([
    ['success', 'status', 4000],
    ['error', 'alert', 8000],
  ] as const)('announces %s and dismisses after the appropriate delay', (tone, role, delay) => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    render(<Toast notification={{ message: 'Task feedback', tone }} onDismiss={dismiss} />);
    expect(screen.getByRole(role).textContent).toContain('Task feedback');
    act(() => vi.advanceTimersByTime(delay - 1));
    expect(dismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('allows manual dismissal and clears the timer on unmount', () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    const { unmount } = render(<Toast notification={{ message: 'Saved', tone: 'success' }} onDismiss={dismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    unmount();
    act(() => vi.advanceTimersByTime(8000));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('restarts the timeout when a new notification replaces the previous one', () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    const { rerender } = render(<Toast notification={{ message: 'Saved', tone: 'success' }} onDismiss={dismiss} />);
    act(() => vi.advanceTimersByTime(3000));
    rerender(<Toast notification={{ message: 'Connection lost', tone: 'error' }} onDismiss={dismiss} />);
    act(() => vi.advanceTimersByTime(7999));
    expect(dismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});

describe('infinite scroll trigger', () => {
  function mockObserver() {
    let callback: IntersectionObserverCallback;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const observer = { observe, disconnect } as unknown as IntersectionObserver;
    vi.stubGlobal('IntersectionObserver', vi.fn(function (handler: IntersectionObserverCallback) {
      callback = handler;
      return observer;
    }));
    return {
      observe,
      disconnect,
      intersect: (visible: boolean) => act(() => callback([{ isIntersecting: visible } as IntersectionObserverEntry], observer)),
    };
  }

  it('loads when the sentinel becomes visible and disconnects on unmount', () => {
    const observer = mockObserver();
    const load = vi.fn();
    const { unmount } = render(<LoadMoreTasks hasMore loading={false} error={false} disabled={false} onLoadMore={load} />);
    expect(observer.observe).toHaveBeenCalledTimes(1);
    observer.intersect(false);
    expect(load).not.toHaveBeenCalled();
    observer.intersect(true);
    expect(load).toHaveBeenCalledTimes(1);
    expect(observer.disconnect).toHaveBeenCalled();
    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(2);
  });

  it.each([
    { hasMore: false, disabled: false, error: false },
    { hasMore: true, disabled: true, error: false },
    { hasMore: true, disabled: false, error: true },
  ])('does not automatically request a page when blocked: %o', (props) => {
    const observer = mockObserver();
    render(<LoadMoreTasks {...props} loading={false} onLoadMore={vi.fn()} />);
    expect(observer.observe).not.toHaveBeenCalled();
    if (!props.hasMore) expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers manual loading when IntersectionObserver is unavailable', () => {
    const load = vi.fn();
    render(<LoadMoreTasks hasMore loading={false} error={false} disabled={false} onLoadMore={load} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load more tasks' }));
    expect(load).toHaveBeenCalledTimes(1);
  });
});
