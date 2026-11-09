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
        </div>
      </header>
      <main id="workspace" tabIndex={-1}>
        <TaskManager initialPage={firstPage} />
        <footer className="app-footer">
          <span>Tasks are stored temporarily and reset when the server restarts.</span>
        </footer>
      </main>
    </>
  );
}
