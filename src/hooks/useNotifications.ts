import { useCallback } from 'react';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationSystem {
  success: (message: string, options?: NotificationOptions) => void;
  error: (message: string, options?: NotificationOptions) => void;
  warning: (message: string, options?: NotificationOptions) => void;
  info: (message: string, options?: NotificationOptions) => void;
  loading: (message: string, options?: NotificationOptions) => void;
  promise: <T>(
    promise: Promise<T>,
    loading: string,
    success: string | ((data: T) => string),
    error?: string | ((error: Error) => string)
  ) => Promise<T>;
}

export const useNotifications = (): NotificationSystem => {
  const { toast: useToastHook } = useToast();

  const success = useCallback((message: string, options?: NotificationOptions) => {
    toast.success(message, {
      duration: options?.duration,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  }, []);

  const error = useCallback((message: string, options?: NotificationOptions) => {
    toast.error(message, {
      duration: options?.duration,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  }, []);

  const warning = useCallback((message: string, options?: NotificationOptions) => {
    toast.warning(message, {
      duration: options?.duration,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  }, []);

  const info = useCallback((message: string, options?: NotificationOptions) => {
    toast.info(message, {
      duration: options?.duration,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  }, []);

  const loading = useCallback((message: string, options?: NotificationOptions) => {
    toast.loading(message, {
      duration: options?.duration,
    });
  }, []);

  const promise = useCallback(<T,>(
    promise: Promise<T>,
    loading: string,
    success: string | ((data: T) => string),
    error?: string | ((error: Error) => string)
  ): Promise<T> => {
    toast.promise(promise, {
      loading,
      success,
      error: error || "Something went wrong",
    });
    return promise;
  }, []);

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
  };
};