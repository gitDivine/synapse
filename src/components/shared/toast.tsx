'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';

interface Toast {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toast: (message: string, variant?: Toast['variant']) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((message: string, variant: Toast['variant'] = 'info') => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
        aria-live="assertive"
        aria-atomic="true"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm shadow-lg backdrop-blur-sm',
                t.variant === 'success' && 'border-success/30 bg-success/10 text-success',
                t.variant === 'error' && 'border-error/30 bg-error/10 text-error',
                t.variant === 'info' && 'border-accent/30 bg-accent-soft text-accent',
              )}
              role="status"
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
