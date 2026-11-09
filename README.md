# Daybook

A simple task manager built for the Artefact Software Engineer case, with server rendering, CRUD operations, and infinite scrolling.

## Run locally

Use Node.js 22 or newer and pnpm 11.25.0.

```sh
git clone https://github.com/Phomhado/artefact.git
cd artefact
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). No database setup or environment variables are needed.

For a production build:

```sh
pnpm build
pnpm start
```

## Main decisions

- **Next.js 15 App Router:** runs the frontend and backend in one project. Version 15 follows the brief, and a separate API server would add unnecessary setup.
- **TypeScript and tRPC:** share procedure types between frontend and backend. Zod validates incoming data at runtime; static types alone cannot validate requests.
- **In-memory storage:** a server-side Map meets the requirement without a database or ORM. Tasks use UUIDs and ISO creation timestamps, displayed in UTC. Field names follow the brief: `id`, `titulo`, `descricao`, and `dataCriacao`.
- **SSR and pagination:** each request renders the first 10 tasks through a server-side tRPC caller. TanStack Query reuses that data and loads further pages. A creation-order cursor keeps pagination stable when tasks are edited or deleted.
- **Small components and plain CSS:** the form owns its inputs, `TaskManager` coordinates interactions, and `useTasks` handles requests and caching. The interface uses Artefact-inspired navy and pink, self-hosted IBM Plex Sans, and inline SVG icons. Fonts are bundled with the app rather than requested from an external font service.

## User experience

Creation and editing use a modal with a larger description field. Focus moves to the title when it opens and returns to the trigger when it closes. Enter in the title submits; Enter in the description adds a new line. Successful saves close the modal, while failed saves keep the entered values. Cancel, Escape, and clicking the backdrop close it when no save is pending.

Deletion updates the list and count immediately, with toast feedback. If the request fails, the task is restored and an error explains what happened. The backend rejects blank titles and returns meaningful errors for missing tasks.

Infinite scroll shows skeleton cards while loading, with a **Load more** button as a fallback. Card actions appear on hover or keyboard focus on desktop, and through a swipe or actions button on mobile. Empty states, visible focus indicators, and reduced-motion support are included.

## Structure

```text
src/
  app/          Pages, layout, and tRPC HTTP endpoint
  components/   Form, list, cards, and feedback
  hooks/        Queries, mutations, and cache updates
  lib/          Client setup and shared helpers
  server/       Task store, validation, and procedures
  styles/       Global and workspace CSS
tests/          Test suites grouped by component or module
```

## Checks

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Tests cover CRUD through the store, router, and HTTP handler; validation limits; missing tasks; pagination; optimistic rollback; modal creation and editing; failed saves and retries; cancellation; focus restoration; swipe controls; scroll triggers; skeleton loading; and notification timing. Component tests use jsdom, so visual layout and real browser gestures still need manual checks.

## Limitations

Tasks survive browser refreshes but disappear when the server restarts. Everyone using the same server process shares the list; separate instances have separate stores. This meets the exercise requirements but would need persistent storage and authentication for a production application with separate user accounts.
