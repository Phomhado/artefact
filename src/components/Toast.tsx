'use client';

import { useEffect } from 'react';

export type Notification = {
  message: string;
  tone: 'success' | 'error';
};

type ToastProps = {
  notification: Notification;
  onDismiss: () => void;
};

export function Toast({ notification, onDismiss }: ToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, notification.tone === 'error' ? 8000 : 4000);
    return () => window.clearTimeout(timeout);
  }, [notification, onDismiss]);

  return (
    <div className={`toast toast-${notification.tone}`} role={notification.tone === 'error' ? 'alert' : 'status'}>
      <p>{notification.message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">×</button>
    </div>
  );
}
