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
          background: '#fff',
          color: '#3D3D3D',
          padding: '16px',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          maxWidth: '400px'
        },
        success: {
          iconTheme: {
            primary: '#22C55E',
            secondary: '#fff'
          }
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff'
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
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-slide-down' : 'animate-fade-out'
          } flex items-start gap-3 bg-white px-4 py-3 rounded-2xl shadow-lg ring-1 ring-black/5 max-w-sm`}
        >
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-success/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-accent-success" />
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

  error: (message: string, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-slide-down' : 'animate-fade-out'
          } flex items-start gap-3 bg-white px-4 py-3 rounded-2xl shadow-lg ring-1 ring-accent-danger/20 max-w-sm`}
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
          } flex items-start gap-3 bg-white px-4 py-3 rounded-2xl shadow-lg ring-1 ring-accent-warning/20 max-w-sm`}
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
          } flex items-start gap-3 bg-white px-4 py-3 rounded-2xl shadow-lg ring-1 ring-teal/20 max-w-sm`}
        >
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal/10 flex items-center justify-center">
            <Info className="w-4 h-4 text-teal" />
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
        background: '#fff',
        color: '#3D3D3D',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
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
        background: '#fff',
        color: '#3D3D3D',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
      }
    });
  }
};
