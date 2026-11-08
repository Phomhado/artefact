import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { TASK_PAGE_SIZE } from '@/lib/taskPagination';
import type { TaskPage } from '@/server/tasks';
import { removeCachedTask, type TaskCache } from '@/lib/taskCache';

type TaskInput = {
  titulo: string;
  descricao: string;
  id?: string;
};

const taskKey = ['tasks'];

export function useTasks(initialPage: TaskPage) {
  const queryClient = useQueryClient();

  const tasks = useInfiniteQuery({
    queryKey: taskKey,
    queryFn: ({ pageParam }) => trpc.tasks.list.query({ limit: TASK_PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    // Reuse the server-rendered first page instead of fetching it again on mount.
    initialData: { pages: [initialPage], pageParams: [undefined] },
    staleTime: 30_000,
  });

  async function refreshTasks() {
    await queryClient.invalidateQueries({ queryKey: taskKey });
  }

  const saveTask = useMutation({
    mutationFn: (input: TaskInput) => {
      return input.id
        ? trpc.tasks.update.mutate({ ...input, id: input.id })
        : trpc.tasks.create.mutate(input);
    },
    onSuccess: () => { void refreshTasks(); },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => trpc.tasks.delete.mutate({ id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKey });
      const previous = queryClient.getQueryData<TaskCache>(taskKey);

      if (previous) {
        queryClient.setQueryData(taskKey, removeCachedTask(previous, id));
      }

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) queryClient.setQueryData(taskKey, context.previous);
    },
    onSettled: () => { void refreshTasks(); },
  });

  return { tasks, saveTask, deleteTask };
}
