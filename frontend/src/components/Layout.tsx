import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button, Icon, Text } from '@gravity-ui/uikit';
import { Magnifier, ArrowUpFromLine, Folder, Person, Gear } from '@gravity-ui/icons';
import type { IconData } from '@gravity-ui/uikit';
import { useAuth } from '../hooks/useAuth';
import './Layout.css';

interface NavItem {
  to: string;
  label: string;
  icon: IconData;
}

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const Layout: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="layout-loading">
        <Text variant="body-1">Загрузка...</Text>
      </div>
    );
  }

  const navItems: NavItem[] = [
    { to: '/', label: 'Поиск', icon: Magnifier },
    { to: '/upload', label: 'Загрузить', icon: ArrowUpFromLine },
    { to: '/documents', label: 'Документы', icon: Folder },
    { to: '/profile', label: 'Профиль', icon: Person },
    ...(user?.role === 'admin'
      ? [{ to: '/admin', label: 'Администрирование', icon: Gear }]
      : []),
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const initials = user ? getInitials(user.username) || user.username.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="layout">
      <aside className="layout-sidebar">
        <div className="layout-logo">
          <div className="layout-logo-icon"></div>
          <span className="layout-logo-text">КорнДок</span>
        </div>
        <nav className="layout-nav">
          {navItems.map((item) => (
            <button
              key={item.to}
              className={`nav-item${isActive(item.to) ? ' active' : ''}`}
              onClick={() => navigate(item.to)}
            >
              <span className="nav-item-icon">
                <Icon data={item.icon} size={18} />
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="layout-main">
        <header className="layout-header">
          <div className="layout-header-user">
            <div className="layout-header-info">
              <Text variant="body-2" style={{ fontWeight: 600 }}>{user?.username}</Text>
              <Text variant="caption-2" color="secondary">
                {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
              </Text>
            </div>
            <div className="layout-avatar">{initials}</div>
          </div>
          <Button view="outlined" size="s" onClick={logout}>
            Выйти
          </Button>
        </header>
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
