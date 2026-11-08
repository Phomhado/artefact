import { describe, expect, it } from 'vitest';
import { appRouter } from './router';

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
