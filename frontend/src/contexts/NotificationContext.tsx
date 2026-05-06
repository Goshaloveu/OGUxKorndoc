/**
 * Notification system: one data source, two surfaces.
 *
 * Surface 1 — Toast popup (top-right, auto-hides in 5s, clickable → mark read)
 * Surface 2 — Bell dropdown inbox (persistent, survives refresh)
 *
 * TODO: Move notifications to a backend DB table (notifications) for cross-device sync.
 *       Current storage: localStorage key `app-notifications` (single-browser only).
 *       To go per-user: key by `notifications_${userId}` — call setUserId() after login.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotifType = 'success' | 'error' | 'info' | 'warning';
export type NotifCategory = 'upload' | 'permission' | 'admin' | 'settings' | 'document';

export interface AppNotification {
  id: string;
  type: NotifType;
  category: NotifCategory;
  title: string;
  description?: string;
  timestamp: number; // Date.now()
  read: boolean;
}

export interface PendingTask {
  docId: number;
  filename: string;
  registeredAt: number;
  lastKnownStatus?: string;
}

export interface CategorySettings {
  upload: boolean;
  permission: boolean;
  admin: boolean;
  settings: boolean;
  document: boolean;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const NOTIF_KEY = 'app-notifications';
const SETTINGS_KEY = 'notif-category-settings';
const TASKS_KEY = 'app-pending-tasks';
const MAX_NOTIFICATIONS = 100;
const TASK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const DEFAULT_SETTINGS: CategorySettings = {
  upload: true,
  permission: true,
  admin: true,
  settings: true,
  document: true,
};

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw) as AppNotification[];
  } catch { /* ignore */ }
  return [];
}

function saveNotifications(items: AppNotification[]): void {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

function loadCategorySettings(): CategorySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveCategorySettings(s: CategorySettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

function loadPendingTasks(): PendingTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) {
      const tasks = JSON.parse(raw) as PendingTask[];
      // Drop tasks older than timeout
      const cutoff = Date.now() - TASK_TIMEOUT_MS;
      return tasks.filter((t) => t.registeredAt > cutoff);
    }
  } catch { /* ignore */ }
  return [];
}

function savePendingTasks(tasks: PendingTask[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch { /* ignore */ }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  categorySettings: CategorySettings;
  pendingTasks: PendingTask[];
  addNotification: (
    type: NotifType,
    category: NotifCategory,
    title: string,
    description?: string,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  updateCategorySettings: (partial: Partial<CategorySettings>) => void;
  registerPendingUpload: (docId: number, filename: string) => void;
  resolvePendingTask: (docId: number) => void;
  updateTaskStatus: (docId: number, status: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [categorySettings, setCategorySettings] = useState<CategorySettings>(loadCategorySettings);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>(loadPendingTasks);

  // Keep refs so callbacks are always fresh without re-registering effects
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  // Persist notifications on change
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Persist pending tasks on change
  useEffect(() => {
    savePendingTasks(pendingTasks);
  }, [pendingTasks]);

  // ── markAsRead (stable ref needed by toast actions) ───────────────────────
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next);
      return next;
    });
  }, []);

  const markAsReadRef = useRef(markAsRead);
  markAsReadRef.current = markAsRead;

  // ── Core: add notification + fire toast ──────────────────────────────────
  const addNotification = useCallback(
    (type: NotifType, category: NotifCategory, title: string, description?: string) => {
      if (!categorySettings[category]) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const notif: AppNotification = {
        id,
        type,
        category,
        title,
        description,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => {
        const next = [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
        saveNotifications(next);
        return next;
      });

      // Map our type to Gravity UI Toaster theme
      const toastTheme = type === 'success'
        ? 'success'
        : type === 'error'
          ? 'danger'
          : type === 'warning'
            ? 'warning'
            : 'info';

      // Fire toast — clicking "Прочитано" marks bell item as read
      toaster.add({
        name: id,
        title,
        content: description,
        theme: toastTheme,
        autoHiding: 5000,
        isClosable: true,
        actions: [
          {
            label: 'Прочитано',
            onClick: () => markAsReadRef.current(id),
            removeAfterClick: true,
          },
        ],
      });
    },
    [categorySettings],
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  const updateCategorySettings = useCallback((partial: Partial<CategorySettings>) => {
    setCategorySettings((prev) => {
      const next = { ...prev, ...partial };
      saveCategorySettings(next);
      return next;
    });
  }, []);

  // ── Pending task management ───────────────────────────────────────────────
  const registerPendingUpload = useCallback((docId: number, filename: string) => {
    setPendingTasks((prev) => {
      // Avoid duplicates
      if (prev.some((t) => t.docId === docId)) return prev;
      const next: PendingTask[] = [
        ...prev,
        { docId, filename, registeredAt: Date.now() },
      ];
      savePendingTasks(next);
      return next;
    });
  }, []);

  const resolvePendingTask = useCallback((docId: number) => {
    setPendingTasks((prev) => {
      const next = prev.filter((t) => t.docId !== docId);
      savePendingTasks(next);
      return next;
    });
  }, []);

  const updateTaskStatus = useCallback((docId: number, status: string) => {
    setPendingTasks((prev) => {
      const next = prev.map((t) =>
        t.docId === docId ? { ...t, lastKnownStatus: status } : t,
      );
      savePendingTasks(next);
      return next;
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        categorySettings,
        pendingTasks,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        updateCategorySettings,
        registerPendingUpload,
        resolvePendingTask,
        updateTaskStatus,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
