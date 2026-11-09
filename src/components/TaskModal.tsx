'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type TaskModalProps = {
  children: ReactNode;
  saving: boolean;
  onClose: () => void;
};

export function TaskModal({ children, saving, onClose }: TaskModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>('input')?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="task-modal"
      aria-labelledby="form-heading"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input, textarea'))
          .filter((element) => !element.matches(':disabled'));
        const first = controls[0];
        const last = controls.at(-1);

        if (!first) {
          event.preventDefault();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || saving) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <button className="modal-close" type="button" disabled={saving} onClick={onClose} aria-label="Close dialog">×</button>
      {children}
    </dialog>
  );
}
