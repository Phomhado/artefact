'use client';

import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { errorMessage } from '@/lib/errorMessage';
import type { Task, TaskPage } from '@/server/tasks';
import { TaskForm, type TaskFormValues } from './TaskForm';
import { TaskList } from './TaskList';
import { LoadMoreTasks } from './LoadMoreTasks';

type TaskManagerProps = {
  initialPage: TaskPage;
};

export function TaskManager({ initialPage }: TaskManagerProps) {
  const { tasks, saveTask, deleteTask } = useTasks(initialPage);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const busy = saveTask.isPending || deleteTask.isPending;

  function resetForm() {
    setEditingTask(null);
    setFormVersion((version) => version + 1);
  }

  async function handleSave(values: TaskFormValues) {
    setNotice('');
    await saveTask.mutateAsync({ ...values, id: editingTask?.id });
    setNotice(editingTask ? 'Task updated.' : 'Task created.');
    resetForm();
  }

  async function handleDelete(id: string) {
    setNotice('');
    setDeleteError('');

    try {
      await deleteTask.mutateAsync(id);
      if (editingTask?.id === id) resetForm();
      setNotice('Task deleted.');
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setFormVersion((version) => version + 1);
    setNotice('');
  }

  return (
    <div className="workspace">
      <TaskList
        tasks={tasks.data.pages.flatMap((page) => page.items)}
        total={tasks.data.pages[0].total}
        refreshing={tasks.isRefetching}
        refreshFailed={tasks.isRefetchError}
        notice={notice}
        deleteError={deleteError}
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
      <TaskForm
        key={formVersion}
        task={editingTask}
        disabled={busy}
        saving={saveTask.isPending}
        autoFocus={formVersion > 0}
        onSave={handleSave}
        onCancel={resetForm}
      />
    </div>
  );
}
