import type { InfiniteData } from '@tanstack/react-query';
import type { TaskPage } from '@/server/tasks';

export type TaskCache = InfiniteData<TaskPage, number | undefined>;

export function removeCachedTask(data: TaskCache, id: string): TaskCache {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((task) => task.id !== id),
      total: Math.max(0, page.total - 1),
    })),
  };
}
