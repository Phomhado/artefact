'use client';

import { useId, useRef, useState, type TouchEvent } from 'react';
import type { Task } from '@/server/tasks';
import { Icon } from './Icon';

type TaskCardProps = {
  task: Task;
  disabled: boolean;
  deleting: boolean;
  restored?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

export function TaskCard({ task, disabled, deleting, restored, onEdit, onDelete }: TaskCardProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const actionsId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  function handleTouchEnd(event: TouchEvent<HTMLLIElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const horizontal = touch.clientX - start.x;
    const vertical = touch.clientY - start.y;
    if (Math.abs(horizontal) > 50 && Math.abs(horizontal) > Math.abs(vertical) * 1.5) {
      setActionsOpen(horizontal < 0);
    }
  }

  return (
    <li
      className={`task-card${actionsOpen ? ' actions-open' : ''}${restored ? ' restored' : ''}`}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStart.current = null; }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && actionsOpen) {
          setActionsOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <span className="task-symbol"><Icon name="stack" /></span>
      <div className="task-content">
        <h3>{task.titulo}</h3>
        {task.descricao && <p className="description">{task.descricao}</p>}
        <div className="task-footer">
          <time dateTime={task.dataCriacao}>
            {task.dataCriacao.slice(0, 10)} <span>·</span> {task.dataCriacao.slice(11, 16)} UTC
          </time>
          <div className="card-controls">
            <button
              ref={toggleRef}
              type="button"
              className="text-button actions-toggle"
              aria-label={`Actions for ${task.titulo}`}
              aria-expanded={actionsOpen}
              aria-controls={actionsId}
              onClick={() => setActionsOpen((open) => !open)}
            >
              <span aria-hidden="true">•••</span>
            </button>
            <div id={actionsId} className="task-actions">
              <button
                className="text-button"
                disabled={disabled}
                onClick={() => onEdit(task)}
                aria-label={`Edit ${task.titulo}`}
              >
                <Icon name="edit" /> Edit
              </button>
              <button
                className="text-button danger"
                disabled={disabled}
                onClick={() => onDelete(task.id)}
                aria-label={`Delete ${task.titulo}`}
              >
                <Icon name="trash" /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
