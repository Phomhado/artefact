import type { Task } from '@/server/tasks';
import type { ReactNode } from 'react';
import { TaskCard } from './TaskCard';
import { Icon } from './Icon';

type TaskListProps = {
  tasks: Task[];
  total: number;
  children: ReactNode;
  refreshing: boolean;
  refreshFailed: boolean;
  restoredTaskId?: string;
  disabled: boolean;
  deletingId?: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
};

export function TaskList({
  tasks,
  total,
  children,
  refreshing,
  refreshFailed,
  restoredTaskId,
  disabled,
  deletingId,
  onEdit,
  onDelete,
  onRetry,
}: TaskListProps) {
  return (
    <section className="task-list" aria-labelledby="list-heading" aria-busy={refreshing}>
      <div className="list-heading">
        <h2 id="list-heading">All tasks <span className="count">{total}</span></h2>
        {refreshing ? <span className="list-meta" role="status">Refreshing…</span> : <span className="list-meta">Newest first</span>}
      </div>
      {refreshFailed && (
        <div className="error" role="alert">
          Could not refresh tasks.{' '}
          <button className="secondary" onClick={onRetry}>Try again</button>
        </div>
      )}
      {tasks.length === 0 ? (
        <div className="empty">
          <div className="empty-illustration" aria-hidden="true">
            <div className="empty-sheet sheet-back" />
            <div className="empty-sheet"><Icon name="stack" /><i /><i /><i /></div>
            <span className="empty-plus"><Icon name="plus" /></span>
          </div>
          <p className="eyebrow">Room for what’s next</p>
          <h3>You’re all caught up!</h3>
          <p>Add a task above to get started.</p>
          <a className="empty-link" href="#title">Create your first task <Icon name="arrow" /></a>
        </div>
      ) : (
        <ul className="task-items">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              disabled={disabled}
              deleting={deletingId === task.id}
              restored={restoredTaskId === task.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}
