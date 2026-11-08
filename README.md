# Daybook

A small task manager built with Next.js 15, React, TypeScript, and tRPC.

## Running locally

Use Node.js 22 LTS and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. To run a production build:

```sh
pnpm build
pnpm start
```

## How it works

The home page loads the first 10 tasks through a server-side tRPC caller and renders them on each request. Client components handle the form and send mutations to `/api/trpc`. TanStack Query refreshes loaded pages after a successful change.

Scrolling near the bottom loads the next 10 tasks. A Load more button also supports keyboard navigation and browsers without IntersectionObserver. If a request fails, existing tasks stay visible and the user can retry. Loading stops after the last page.

Pagination uses a numeric cursor based on creation order, newest first. Updating a task does not change its position, and deleting the task used as a cursor does not break the next request. New tasks appear when the list refreshes; loaded pages are fetched sequentially to keep their boundaries consistent.

## Project structure

- `src/app`: pages, layout, and the tRPC HTTP endpoint.
- `src/components`: task form, list, cards, and pagination controls.
- `src/hooks/useTasks.ts`: queries, mutations, and cache refreshes.
- `src/server`: input validation, tRPC procedures, and the task store.
- `src/styles`: application styles.

## Design decisions

The form owns its input state, while TaskManager coordinates editing and feedback. The backend runs inside Next.js so the project only needs one server. A small in-memory store meets the exercise requirements without a database or ORM.

The backend validates inputs with Zod. Titles are trimmed and required; missing tasks return a `NOT_FOUND` error. Task fields follow the names in the brief: `id`, `titulo`, `descricao`, and `dataCriacao`. Creation timestamps are ISO strings and displayed in UTC.

Tasks live in a server-side Map. They survive page refreshes but disappear when the server process restarts. The store is shared by everyone using the same process; it does not support independent server instances or reliable serverless persistence. No database, authentication, or environment variables are needed for this exercise.

## Checks

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

The tests cover the task lifecycle, blank titles, missing tasks, and pagination boundaries, including changes between page requests.

## Interaction details

The task form stays above the list. Enter submits a title, clears the form, and keeps focus in the title field while the request runs. Failed submissions restore the values if no newer draft has been started.

Deletion is optimistic: the task and count update immediately, with a toast for feedback. The previous query data is restored if the request fails, and the restored card slides back into view. Delete requests are guarded against repeated clicks while one is pending.

Additional pages use three pulsing skeleton cards. Edit and delete actions appear on hover or keyboard focus on desktop. On touch devices, swipe left on a card or use its actions button to reveal them; swipe right closes them. Reduced-motion preferences disable the pulse and slide animations.

Interaction tests cover pending and failed requests, draft preservation, swipe controls, and skeleton loading.
