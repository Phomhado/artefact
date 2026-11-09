'use client';

import { useCallback, useRef, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { errorMessage } from '@/lib/errorMessage';
import type { Task, TaskPage } from '@/server/tasks';
import { TaskForm, type TaskFormValues } from './TaskForm';
import { TaskList } from './TaskList';
import { LoadMoreTasks } from './LoadMoreTasks';
import { Toast, type Notification } from './Toast';
import { TaskModal } from './TaskModal';
import { Icon } from './Icon';

type TaskManagerProps = {
  initialPage: TaskPage;
};

export function TaskManager({ initialPage }: TaskManagerProps) {
  const { tasks, saveTask, deleteTask } = useTasks(initialPage);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [restoredTaskId, setRestoredTaskId] = useState<string>();
  const deleteInProgress = useRef(false);
  const dismissNotification = useCallback(() => setNotification(null), []);
  const busy = saveTask.isPending || deleteTask.isPending;

  function closeForm() {
    setFormOpen(false);
    setEditingTask(null);
  }

  async function handleSave(values: TaskFormValues) {
    const taskToEdit = editingTask;
    await saveTask.mutateAsync({ ...values, id: taskToEdit?.id });
    setNotification({ message: taskToEdit ? 'Task updated.' : 'Task created.', tone: 'success' });
    closeForm();
  }

  async function handleDelete(id: string) {
    if (deleteInProgress.current) return;
    deleteInProgress.current = true;
    setRestoredTaskId(undefined);
    setNotification({ message: 'Task deleted.', tone: 'success' });

    try {
      await deleteTask.mutateAsync(id);
      if (editingTask?.id === id) closeForm();
    } catch (error) {
      setRestoredTaskId(id);
      setNotification({ message: `${errorMessage(error)} The task has been restored.`, tone: 'error' });
    } finally {
      deleteInProgress.current = false;
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tasks</h1>
          <p className="page-description">Create, edit, and manage tasks.</p>
        </div>
        <button className="secondary" type="button" onClick={handleCreate} disabled={busy}>
          <Icon name="plus" /> New task
        </button>
      </div>
      <div className="workspace">
      <TaskList
        tasks={tasks.data.pages.flatMap((page) => page.items)}
        total={tasks.data.pages[0].total}
        refreshing={tasks.isRefetching}
        refreshFailed={tasks.isRefetchError}
        restoredTaskId={restoredTaskId}
        disabled={busy}
        deletingId={deleteTask.isPending ? deleteTask.variables : undefined}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRetry={() => tasks.refetch()}
        onCreate={handleCreate}
      >
        <LoadMoreTasks
          hasMore={tasks.hasNextPage}
          loading={tasks.isFetchingNextPage}
          error={tasks.isFetchNextPageError}
          disabled={tasks.isFetching || busy}
          onLoadMore={() => tasks.fetchNextPage()}
        />
      </TaskList>
      </div>
      {formOpen && (
        <TaskModal saving={saveTask.isPending} onClose={closeForm}>
          <TaskForm
            task={editingTask}
            disabled={saveTask.isPending}
            saving={saveTask.isPending}
            onSave={handleSave}
            onCancel={closeForm}
          />
        </TaskModal>
      )}
      {notification && <Toast notification={notification} onDismiss={dismissNotification} />}
    </>
  );
}
