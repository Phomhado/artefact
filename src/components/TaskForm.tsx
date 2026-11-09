'use client';

import { useRef, useState, type FormEvent } from 'react';
import { errorMessage } from '@/lib/errorMessage';
import type { Task } from '@/server/tasks';
import { Icon } from './Icon';

export type TaskFormValues = {
  titulo: string;
  descricao: string;
};

type TaskFormProps = {
  task: Task | null;
  disabled: boolean;
  saving: boolean;
  onSave: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
};

export function TaskForm({ task, disabled, saving, onSave, onCancel }: TaskFormProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(task?.titulo ?? '');
  const [description, setDescription] = useState(task?.descricao ?? '');
  const [error, setError] = useState('');
  const submitLabel = task ? 'Save changes' : 'Create task';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Enter a title.');
      titleRef.current?.focus();
      return;
    }

    const values = { titulo: title.trim(), descricao: description.trim() };

    try {
      await onSave(values);
    } catch (error) {
      setError(`Could not save "${values.titulo}": ${errorMessage(error)}`);
    }
  }

  return (
    <section className="composer" aria-labelledby="form-heading">
      <div className="composer-heading">
        <span className="composer-icon"><Icon name={task ? 'edit' : 'plus'} /></span>
        <div>
          <h2 id="form-heading">{task ? 'Edit task' : 'New task'}</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={disabled}>
          <label htmlFor="title">
            Task title <span className="required-label">Required</span>
          </label>
          <input
            ref={titleRef}
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
            placeholder="Enter task title"
            aria-invalid={!!error}
            aria-describedby={error ? 'form-error' : undefined}
          />
          <label htmlFor="description">
            Description <span className="optional">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={8}
            maxLength={2000}
            value={description}
            placeholder="Enter task details"
            onChange={(event) => setDescription(event.target.value)}
          />
          {error && <p id="form-error" className="error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="primary" type="submit">
              {saving ? 'Saving…' : submitLabel}
              <Icon name="arrow" />
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
