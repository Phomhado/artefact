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
  autoFocus?: boolean;
  onSave: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
};

export function TaskForm({ task, disabled, saving, autoFocus = false, onSave, onCancel }: TaskFormProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(task?.titulo ?? '');
  const [description, setDescription] = useState(task?.descricao ?? '');
  const [error, setError] = useState('');
  const draftVersion = useRef(0);
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
    const version = ++draftVersion.current;

    if (!task) {
      setTitle('');
      setDescription('');
      titleRef.current?.focus();
    }

    try {
      await onSave(values);
    } catch (error) {
      setError(`Could not save "${values.titulo}": ${errorMessage(error)}`);
      if (draftVersion.current === version) {
        if (!task) {
          setTitle(values.titulo);
          setDescription(values.descricao);
        }
      }
    }
  }

  return (
    <section className="composer" aria-labelledby="form-heading">
      <div className="composer-heading">
        <span className="composer-icon"><Icon name={task ? 'edit' : 'plus'} /></span>
        <div>
          <h2 id="form-heading">{task ? 'Edit task' : 'Make a little progress'}</h2>
          <p>{task ? 'A quick update, then back to it.' : 'What’s the next thing on your mind?'}</p>
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
            onChange={(event) => { draftVersion.current++; setTitle(event.target.value); }}
            required
            maxLength={120}
            autoFocus={autoFocus}
            placeholder="e.g. Prepare for the interview"
            aria-invalid={!!error}
            aria-describedby={error ? 'form-error' : undefined}
          />
          <label htmlFor="description">
            Description <span className="optional">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={5}
            maxLength={2000}
            value={description}
            placeholder="Add a little context…"
            onChange={(event) => { draftVersion.current++; setDescription(event.target.value); }}
          />
          {error && <p id="form-error" className="error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="primary" type="submit">
              {saving && task ? 'Saving…' : submitLabel}
              <Icon name="arrow" />
            </button>
            {task && (
              <button className="secondary" type="button" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </fieldset>
      </form>
      <p className="composer-note">Keep it simple. You can always edit it later.</p>
    </section>
  );
}
