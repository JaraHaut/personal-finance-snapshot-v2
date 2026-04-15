import { useState, useEffect } from 'react';
import { registerToastCallback, deregisterToastCallback, type ToastType } from '../context/AppContext';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let _id = 0;

/** Global toast container. Mount once in App.tsx. */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    registerToastCallback((message, type) => {
      const id = ++_id;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    });
    return () => deregisterToastCallback();
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
