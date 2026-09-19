import React, { createContext, useCallback, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Icon from '../components/Icon';

const ToastContext = createContext(null);

const STYLES = {
  success: { bar: 'bg-aqua', icon: 'check', tint: 'bg-aqua/15 text-aqua' },
  error: { bar: 'bg-rust', icon: 'alert', tint: 'bg-rust/10 text-rust' },
  info: { bar: 'bg-brass', icon: 'bolt', tint: 'bg-brass/15 text-brass' },
};

export function ToastProvider({ children }) {
  // Same showToast(message, type) API as before, but rendered through
  // react-hot-toast - toast.custom() lets us keep our own card design
  // (colored bar, icon chip) instead of the library's default bubble.
  const showToast = useCallback((message, type = 'success') => {
    const s = STYLES[type] || STYLES.success;
    toast.custom(
      (t) => (
        <div
          className={`pointer-events-auto relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-2xl bg-surface p-3.5 pl-5 shadow-modal ring-1 ring-ink/5 transition-all ${
            t.visible ? 'animate-toast-in' : 'opacity-0 translate-x-6'
          }`}
        >
          <span className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} />
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.tint}`}>
            <Icon name={s.icon} className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <p className="pt-1 text-sm font-medium text-ink">{message}</p>
        </div>
      ),
      { duration: 3800 }
    );
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="bottom-right"
        containerClassName="!bottom-24 !right-4 md:!bottom-6 md:!right-6"
        toastOptions={{ style: { background: 'transparent', boxShadow: 'none', padding: 0 } }}
      />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
