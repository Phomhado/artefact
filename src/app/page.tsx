import { TaskManager } from '@/components/TaskManager';
import { appRouter } from '@/server/router';
import { Icon } from '@/components/Icon';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function Home() {
  const firstPage = await appRouter.createCaller({}).tasks.list();

  return (
    <>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <header className="app-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="Daybook home">
            <span className="brand-mark"><Icon name="stack" /></span>
            daybook<span className="brand-dot">.</span>
          </Link>
          <span className="workspace-label">Your personal workspace</span>
        </div>
      </header>
      <main id="workspace" tabIndex={-1}>
        <div className="page-heading">
          <div>
            <p className="eyebrow"><span /> A little clarity, every day</p>
            <h1>Your work, <span>in focus.</span></h1>
            <p className="page-description">A simple home for your tasks. One less thing on your mind.</p>
          </div>
          <a className="button secondary new-task-link" href="#title">
            <Icon name="plus" /> New task
          </a>
        </div>
        <TaskManager initialPage={firstPage} />
        <footer className="app-footer">
          <span>Small steps. Clear head.</span>
          <span>Temporary workspace · Tasks reset when the server restarts.</span>
        </footer>
      </main>
    </>
  );
}
