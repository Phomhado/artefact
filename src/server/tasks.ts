import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const taskInput = z.object({
  titulo: z.string().trim().min(1, 'Enter a title.').max(120, 'Use at most 120 characters.'),
  descricao: z.string().trim().max(2000, 'Use at most 2,000 characters.').optional(),
});

export type Task = z.infer<typeof taskInput> & {
  id: string;
  dataCriacao: string;
};

export type TaskPage = {
  items: Task[];
  nextCursor: number | null;
  total: number;
};

export function createTaskStore() {
  const tasks = new Map<string, Task>();
  const positions = new Map<string, number>();
  let nextPosition = 1;

  function find(id: string) {
    const task = tasks.get(id);
    if (!task) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found.' });
    }
    return task;
  }

  return {
    list: () => Array.from(tasks.values()).reverse(),
    listPage(limit: number, cursor?: number): TaskPage {
      // Creation order stays stable when a task is edited or the cursor task is deleted.
      const remaining = Array.from(tasks.values()).reverse().filter((task) => {
        return cursor === undefined || positions.get(task.id)! < cursor;
      });
      const items = remaining.slice(0, limit);
      const lastTask = items.at(-1);

      return {
        items,
        nextCursor: remaining.length > limit && lastTask ? positions.get(lastTask.id)! : null,
        total: tasks.size,
      };
    },
    create(input: z.infer<typeof taskInput>) {
      const task = {
        ...taskInput.parse(input),
        id: randomUUID(),
        dataCriacao: new Date().toISOString(),
      };
      tasks.set(task.id, task);
      positions.set(task.id, nextPosition++);
      return task;
    },
    update(id: string, input: z.infer<typeof taskInput>) {
      const task = { ...find(id), ...taskInput.parse(input) };
      tasks.set(id, task);
      return task;
    },
    delete(id: string) {
      find(id);
      tasks.delete(id);
      positions.delete(id);
      return { id };
    },
  };
}

// Keep the same store when Next.js reloads server modules during development.
const globalStore = globalThis as typeof globalThis & {
  taskStore?: ReturnType<typeof createTaskStore>;
};

export const taskStore = globalStore.taskStore ??= createTaskStore();
