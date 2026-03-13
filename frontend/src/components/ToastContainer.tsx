/**
 * ToastContainer — renders toasts from the @gravity-ui/uikit toaster-singleton.
 *
 * Gravity UI v7 does not export ToasterProvider/ToasterComponent from the root
 * package. We subscribe to the singleton's event emitter directly and render a
 * minimal toast list so we can keep using `toaster.add()` throughout the app.
 */
import React, { useEffect, useState } from 'react';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';

interface Toast {
  name: string;
  title?: string;
  theme?: 'info' | 'success' | 'warning' | 'danger' | 'normal';
  autoHiding?: number | false;
  addedAt?: number;
}

const THEME_BG: Record<string, string> = {
  success: '#e6f4ea',
  danger: '#fdecea',
  warning: '#fff8e1',
  info: '#e3f2fd',
  normal: '#f5f5f5',
};

const THEME_BORDER: Record<string, string> = {
  success: '#34a853',
  danger: '#ea4335',
  warning: '#fbbc04',
  info: '#4285f4',
  normal: '#ccc',
};

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // `toaster` is an instance of Toaster which implements ToasterImplementation.
    // subscribe() is defined on the class but the exported type ToasterPublicMethods
    // does not include it. We cast via unknown to the known interface to stay type-safe.
    interface WithSubscribe {
      subscribe(cb: (toasts: Toast[]) => void): () => void;
    }
    const unsubscribe = (toaster as unknown as WithSubscribe).subscribe((updated) => {
      setToasts([...updated]);
    });
    return unsubscribe;
  }, []);

  // Auto-hide toasts
  useEffect(() => {
    toasts.forEach((t) => {
      if (t.autoHiding && t.autoHiding > 0) {
        const elapsed = Date.now() - (t.addedAt ?? Date.now());
        const remaining = t.autoHiding - elapsed;
        if (remaining > 0) {
          const timer = setTimeout(() => toaster.remove(t.name), remaining);
          return () => clearTimeout(timer);
        } else {
          toaster.remove(t.name);
        }
      }
      return undefined;
    });
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.name}
          style={{
            background: THEME_BG[t.theme ?? 'normal'] ?? THEME_BG.normal,
            border: `1px solid ${THEME_BORDER[t.theme ?? 'normal'] ?? THEME_BORDER.normal}`,
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
          }}
        >
          <span style={{ flex: 1 }}>{t.title ?? t.name}</span>
          <button
            onClick={() => toaster.remove(t.name)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#666',
              padding: '0 4px',
              lineHeight: 1,
            }}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
