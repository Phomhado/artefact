'use client';

import { useEffect, useRef } from 'react';
import { TaskCardSkeleton } from './TaskCardSkeleton';

type LoadMoreTasksProps = {
  hasMore: boolean;
  loading: boolean;
  error: boolean;
  disabled: boolean;
  onLoadMore: () => void;
};

export function LoadMoreTasks({ hasMore, loading, error, disabled, onLoadMore }: LoadMoreTasksProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !hasMore || disabled || error || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        onLoadMore();
      }
    }, { rootMargin: '200px' });

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, disabled, error, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className="load-more" aria-busy={loading}>
      {error && <p className="error" role="alert">Could not load more tasks. Please try again.</p>}
      {loading && (
        <div className="loading-cards" role="status" aria-label="Loading more tasks">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      )}
      <button
        className="secondary"
        disabled={disabled}
        onClick={onLoadMore}
      >
        {error ? 'Try again' : 'Load more tasks'}
      </button>
    </div>
  );
}
