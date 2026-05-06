import React, { useRef, useState } from 'react';
import { Button, Icon, Label, Popup, Text, Tooltip } from '@gravity-ui/uikit';
import { Bell, TrashBin, Check } from '@gravity-ui/icons';
import { useNotifications } from '../contexts/NotificationContext';
import type { AppNotification, NotifCategory, NotifType } from '../contexts/NotificationContext';

// ─── Icon maps ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<NotifCategory, string> = {
  upload: '📤',
  permission: '🔑',
  admin: '👤',
  settings: '⚙️',
  document: '🗑️',
};

const TYPE_BORDER: Record<NotifType, string> = {
  success: 'var(--g-color-line-positive)',
  error: 'var(--g-color-line-danger)',
  info: 'var(--g-color-line-info)',
  warning: 'var(--g-color-line-warning)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'только что';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

// ─── Single notification item ─────────────────────────────────────────────────

const NotifItem: React.FC<{
  notif: AppNotification;
  onRead: (id: string) => void;
}> = ({ notif, onRead }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => !notif.read && onRead(notif.id)}
    onKeyDown={(e) => e.key === 'Enter' && !notif.read && onRead(notif.id)}
    style={{
      display: 'flex',
      gap: '10px',
      padding: '10px 12px',
      cursor: notif.read ? 'default' : 'pointer',
      background: notif.read ? 'transparent' : 'var(--g-color-base-info-light)',
      borderLeft: notif.read ? '3px solid transparent' : `3px solid ${TYPE_BORDER[notif.type]}`,
      borderRadius: '0 6px 6px 0',
      transition: 'background 0.15s',
    }}
  >
    <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '2px' }}>
      {CATEGORY_ICONS[notif.category]}
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <Text
        variant="body-2"
        style={{ display: 'block', fontWeight: notif.read ? 400 : 600 }}
      >
        {notif.title}
      </Text>
      {notif.description && (
        <Text
          variant="caption-1"
          color="secondary"
          style={{ display: 'block', marginTop: 1 }}
        >
          {notif.description}
        </Text>
      )}
      <Text variant="caption-1" color="hint" style={{ marginTop: 2, display: 'block' }}>
        {formatTime(notif.timestamp)}
      </Text>
    </div>
    {!notif.read && (
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--g-color-base-info-heavy)',
          flexShrink: 0,
          marginTop: '6px',
        }}
      />
    )}
  </div>
);

// ─── Bell component ───────────────────────────────────────────────────────────

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      {/* Bell button + badge */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <Tooltip content="Уведомления" placement="bottom">
          <Button
            ref={anchorRef}
            view="flat"
            size="m"
            onClick={() => setOpen((o) => !o)}
            selected={open}
          >
            <Icon data={Bell} size={18} />
          </Button>
        </Tooltip>

        {unreadCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: 'var(--g-color-base-danger-heavy)',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              pointerEvents: 'none',
              color: 'var(--g-color-text-light-primary)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>

      {/* Dropdown inbox */}
      <Popup
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        placement="bottom-end"
        style={{ width: 380 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid var(--g-color-line-generic)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text variant="subheader-2">Уведомления</Text>
              {unreadCount > 0 && (
                <Label theme="danger" size="xs">
                  {unreadCount}
                </Label>
              )}
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              {unreadCount > 0 && (
                <Tooltip content="Отметить все прочитанными" placement="bottom">
                  <Button view="flat" size="xs" onClick={markAllAsRead}>
                    <Icon data={Check} size={14} />
                  </Button>
                </Tooltip>
              )}
              {notifications.length > 0 && (
                <Tooltip content="Очистить все" placement="bottom">
                  <Button view="flat" size="xs" onClick={clearAll}>
                    <Icon data={TrashBin} size={14} />
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>

          {/* List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '6px 4px',
            }}
          >
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Text color="secondary">Нет уведомлений</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {notifications.map((notif) => (
                  <NotifItem key={notif.id} notif={notif} onRead={markAsRead} />
                ))}
              </div>
            )}
          </div>
        </div>
      </Popup>
    </>
  );
};

export default NotificationBell;
