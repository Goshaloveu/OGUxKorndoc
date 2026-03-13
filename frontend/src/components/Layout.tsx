import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button, Text } from '@gravity-ui/uikit';
import { useAuth } from '../hooks/useAuth';
import './Layout.css';

interface NavItem {
  to: string;
  label: string;
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
    { to: '/', label: 'Поиск' },
    { to: '/upload', label: 'Загрузить' },
    { to: '/documents', label: 'Документы' },
    { to: '/profile', label: 'Профиль' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Администрирование' }] : []),
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      <aside className="layout-sidebar">
        <div className="layout-logo">
          <Text variant="header-1">DocSearch</Text>
        </div>
        <nav className="layout-nav">
          {navItems.map((item) => (
            <Button
              key={item.to}
              view={isActive(item.to) ? 'outlined' : 'flat'}
              width="max"
              size="l"
              onClick={() => navigate(item.to)}
            >
              {item.label}
            </Button>
          ))}
        </nav>
      </aside>
      <div className="layout-main">
        <header className="layout-header">
          <div className="layout-header-user">
            <Text variant="body-2">{user?.username}</Text>
            <Text variant="caption-2" color="secondary">
              {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </Text>
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
