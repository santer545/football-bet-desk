import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createId } from '@/utils/id';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  kind: ToastKind;
}

interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      toasts: [],
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      addToast: (toast) => {
        const id = createId('toast');
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        window.setTimeout(() => {
          if (get().toasts.some((item) => item.id === id)) {
            set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
          }
        }, 4200);
        return id;
      },
      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
    }),
    {
      name: 'fbd:ui',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);

export const useSidebarCollapsed = (): boolean => useUIStore((state) => state.sidebarCollapsed);
export const useToasts = (): Toast[] => useUIStore((state) => state.toasts);
export const useAddToast = (): UIState['addToast'] => useUIStore((state) => state.addToast);
