'use client';

import { Toaster as HotToaster, toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={12}
      containerStyle={{
        top: 20,
        right: 20
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1C2230',
          color: '#E8EDF4',
          padding: '16px',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
          border: '1px solid #2A3140',
          maxWidth: '400px'
        },
        success: {
          iconTheme: {
            primary: '#6DD4B8',
            secondary: '#0A0E14'
          }
        },
        error: {
          iconTheme: {
            primary: '#E57B7B',
            secondary: '#0A0E14'
          }
        }
      }}
    />
  );
}

// Custom toast functions with icons
interface ToastOptions {
  duration?: number;
  id?: string;
  /** Bouton d'action dans le toast (ex. « Annuler »). */
  action?: { label: string; onClick: () => void };
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-slide-down' : 'animate-fade-out'
          } flex items-start gap-3 bg-surface px-4 py-3 rounded-2xl shadow-lg ring-1 ring-black/5 max-w-sm`}
        >
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-success/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-accent-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal">{message}</p>
          </div>
          {options?.action && (
            <button
              type="button"
              onClick={() => {
                options.action?.onClick();
                toast.dismiss(t.id);
              }}
              className="flex-shrink-0 text-sm font-semibold text-sage hover:text-sage-dark"
            >
              {options.action.label}
            </button>
          )}
          <button
            onClick={() => toast.dismiss(t.id)}
            aria-label="Fermer"
            className="flex-shrink-0 text-stone hover:text-charcoal transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: options?.duration || (options?.action ? 6000 : 4000), id: options?.id }
    );
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-slide-down' : 'animate-fade-out'
          } flex items-start gap-3 bg-surface px-4 py-3 rounded-2xl shadow-lg ring-1 ring-accent-danger/20 max-w-sm`}
        >
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-danger/10 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-accent-danger" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal">{message}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: options?.duration || 5000, id: options?.id }
    );
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-slide-down' : 'animate-fade-out'
          } flex items-start gap-3 bg-surface px-4 py-3 rounded-2xl shadow-lg ring-1 ring-accent-warning/20 max-w-sm`}
        >
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-warning/10 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-accent-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal">{message}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: options?.duration || 4000, id: options?.id }
    );
  },

  info: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-slide-down' : 'animate-fade-out'
          } flex items-start gap-3 bg-surface px-4 py-3 rounded-2xl shadow-lg ring-1 ring-sage/20 max-w-sm`}
        >
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sage-light flex items-center justify-center">
            <Info className="w-4 h-4 text-sage" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal">{message}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: options?.duration || 4000, id: options?.id }
    );
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      id: options?.id,
      style: {
        background: '#1C2230',
        color: '#E8EDF4',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)'
      }
    });
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      style: {
        background: '#1C2230',
        color: '#E8EDF4',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)'
      }
    });
  }
};
