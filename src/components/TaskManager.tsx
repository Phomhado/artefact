'use client';

import { useCallback, useRef, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { errorMessage } from '@/lib/errorMessage';
import type { Task, TaskPage } from '@/server/tasks';
import { TaskForm, type TaskFormValues } from './TaskForm';
import { TaskList } from './TaskList';
import { LoadMoreTasks } from './LoadMoreTasks';
import { Toast, type Notification } from './Toast';

type TaskManagerProps = {
  initialPage: TaskPage;
};

export function TaskManager({ initialPage }: TaskManagerProps) {
  const { tasks, saveTask, deleteTask } = useTasks(initialPage);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [restoredTaskId, setRestoredTaskId] = useState<string>();
  const deleteInProgress = useRef(false);
  const dismissNotification = useCallback(() => setNotification(null), []);
  const busy = saveTask.isPending || deleteTask.isPending;

  function resetForm() {
    setEditingTask(null);
    setFormVersion((version) => version + 1);
  }

  async function handleSave(values: TaskFormValues) {
    const taskToEdit = editingTask;
    await saveTask.mutateAsync({ ...values, id: taskToEdit?.id });
    setNotification({ message: taskToEdit ? 'Task updated.' : 'Task created.', tone: 'success' });
    if (taskToEdit) resetForm();
  }

  async function handleDelete(id: string) {
    if (deleteInProgress.current) return;
    deleteInProgress.current = true;
    setRestoredTaskId(undefined);
    setNotification({ message: 'Task deleted.', tone: 'success' });

    try {
      await deleteTask.mutateAsync(id);
      if (editingTask?.id === id) resetForm();
    } catch (error) {
      setRestoredTaskId(id);
      setNotification({ message: `${errorMessage(error)} The task has been restored.`, tone: 'error' });
    } finally {
      deleteInProgress.current = false;
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setFormVersion((version) => version + 1);
  }

  return (
    <div className="workspace">
      <TaskForm
        key={formVersion}
        task={editingTask}
        disabled={deleteTask.isPending || (!!editingTask && saveTask.isPending)}
        saving={saveTask.isPending}
        autoFocus={formVersion > 0}
        onSave={handleSave}
        onCancel={resetForm}
      />
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
      >
        <LoadMoreTasks
          hasMore={tasks.hasNextPage}
          loading={tasks.isFetchingNextPage}
          error={tasks.isFetchNextPageError}
          disabled={tasks.isFetching || busy}
          onLoadMore={() => tasks.fetchNextPage()}
        />
      </TaskList>
      {notification && <Toast notification={notification} onDismiss={dismissNotification} />}
    </div>
  );
}
