export function TaskCardSkeleton() {
  return (
    <div className="task-card skeleton-card" aria-hidden="true">
      <span className="skeleton skeleton-icon" />
      <div className="task-content">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-description" />
        <div className="task-footer">
          <div className="skeleton skeleton-date" />
          <div className="skeleton skeleton-actions" />
        </div>
      </div>
    </div>
  );
}
