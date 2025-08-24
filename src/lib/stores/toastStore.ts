import { writable } from 'svelte/store';

interface Toast {
  id: string;
  message: string;
  preset: string;
  timeout: number;
}

function createToastStore() {
  const { subscribe, set, update } = writable<Toast[]>([]);

  return {
    subscribe,
    trigger: (toast: Partial<Toast>) => {
      const id = Date.now().toString();
      const newToast: Toast = {
        id,
        message: toast.message || '',
        preset: toast.preset || 'primary',
        timeout: toast.timeout || 3000,
        ...toast
      } as Toast;

      update(toasts => [...toasts, newToast]);

      // Auto-remove toast after timeout
      setTimeout(() => {
        update(toasts => toasts.filter(t => t.id !== id));
      }, newToast.timeout);

      return id;
    },
    dismiss: (id: string) => {
      update(toasts => toasts.filter(t => t.id !== id));
    },
    clear: () => {
      set([]);
    }
  };
}

export const toastStore = createToastStore();

export function getToastStore() {
  return toastStore;
}
