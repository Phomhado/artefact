import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { taskInput, taskStore } from './tasks';
import { TASK_PAGE_SIZE } from '@/lib/taskPagination';

const t = initTRPC.create();
const taskId = z.object({ id: z.string().uuid() });
const paginationInput = z.object({
  limit: z.number().int().min(1).max(50).default(TASK_PAGE_SIZE),
  cursor: z.number().int().positive().optional(),
}).default({ limit: TASK_PAGE_SIZE });

export const appRouter = t.router({
  tasks: t.router({
    list: t.procedure
      .input(paginationInput)
      .query(({ input }) => taskStore.listPage(input.limit, input.cursor)),
    create: t.procedure.input(taskInput).mutation(({ input }) => taskStore.create(input)),
    update: t.procedure.input(taskInput.extend(taskId.shape)).mutation(({ input }) => {
      const { id, ...changes } = input;
      return taskStore.update(id, changes);
    }),
    delete: t.procedure.input(taskId).mutation(({ input }) => taskStore.delete(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
