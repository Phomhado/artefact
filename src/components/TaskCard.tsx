import type { Task } from '@/server/tasks';
import { Icon } from './Icon';

type TaskCardProps = {
  task: Task;
  disabled: boolean;
  deleting: boolean;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

export function TaskCard({ task, disabled, deleting, onEdit, onDelete }: TaskCardProps) {
  return (
    <li className="task-card">
      <span className="task-symbol"><Icon name="stack" /></span>
      <div className="task-content">
        <h3>{task.titulo}</h3>
        {task.descricao && <p className="description">{task.descricao}</p>}
        <div className="task-footer">
          <time dateTime={task.dataCriacao}>
            {task.dataCriacao.slice(0, 10)} <span>·</span> {task.dataCriacao.slice(11, 16)} UTC
          </time>
          <div className="task-actions">
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
    </li>
  );
}
