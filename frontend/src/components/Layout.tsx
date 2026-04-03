import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Icon, Text, Select, SegmentedRadioGroup } from '@gravity-ui/uikit';
import { AsideHeader, FooterItem } from '@gravity-ui/navigation';
import {
  Magnifier,
  ArrowUpFromLine,
  Folder,
  Person,
  Gear,
  EyeDashed,
  Sun,
  Moon,
  ArrowRightFromSquare,
  CircleQuestion,
} from '@gravity-ui/icons';
import { useAuth } from '../hooks/useAuth';
import { useThemeContext } from '../hooks/useTheme';
import type { AppLang } from '../hooks/useTheme';
import './Layout.css';

const LANG_OPTIONS = [
  { value: 'ru', content: 'RU' },
  { value: 'en', content: 'EN' },
];

const COMPACT_KEY = 'aside-compact';

function loadCompact(): boolean {
  return localStorage.getItem(COMPACT_KEY) === 'true';
}

const Layout: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, lang, setLang } = useThemeContext();
  const [compact, setCompactState] = useState(loadCompact);

  const handleCompact = (v: boolean) => {
    setCompactState(v);
    localStorage.setItem(COMPACT_KEY, String(v));
  };

  if (isLoading) {
    return (
      <div className="layout-loading">
        <Text variant="body-1">Загрузка...</Text>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    {
      id: 'search',
      title: 'Поиск',
      icon: Magnifier,
      current: isActive('/'),
      onItemClick: () => navigate('/'),
    },
    {
      id: 'upload',
      title: 'Загрузить',
      icon: ArrowUpFromLine,
      current: isActive('/upload'),
      onItemClick: () => navigate('/upload'),
    },
    {
      id: 'documents',
      title: 'Документы',
      icon: Folder,
      current: isActive('/documents'),
      onItemClick: () => navigate('/documents'),
    },
    {
      id: 'profile',
      title: 'Профиль',
      icon: Person,
      current: isActive('/profile'),
      onItemClick: () => navigate('/profile'),
    },
    ...(user?.role === 'admin'
      ? [
          {
            id: 'divider-admin',
            title: '',
            type: 'divider' as const,
          },
          {
            id: 'admin',
            title: 'Администрирование',
            icon: EyeDashed,
            current: isActive('/admin'),
            onItemClick: () => navigate('/admin'),
          },
        ]
      : []),
  ];

  return (
    <AsideHeader
      logo={{
        text: 'КорнДок',
        iconSrc: '/logo.svg',
        iconSize: 32,
        href: '/',
        onClick: () => navigate('/'),
      }}
      compact={compact}
      onChangeCompact={handleCompact}
      headerDecoration
      menuItems={menuItems}
      renderFooter={() => (
        <div className="layout-footer">
          {!compact && user && (
            <div className="layout-footer-user">
              <Text variant="caption-2" color="secondary">
                {user.username}
              </Text>
              <Text variant="caption-2" color="hint">
                {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
              </Text>
            </div>
          )}
          <FooterItem
            id="faq"
            title="FAQ"
            icon={CircleQuestion}
            onItemClick={() => {}}
          />
          <FooterItem
            id="settings"
            title="Настройки"
            icon={Gear}
            onItemClick={() => {}}
          />
          <FooterItem
            id="logout"
            title="Выйти"
            icon={ArrowRightFromSquare}
            onItemClick={logout}
          />
        </div>
      )}
      renderContent={() => (
        <div className="layout-main">
          <div className="layout-header">
            <div className="layout-header-right">
              <SegmentedRadioGroup
                size="m"
                value={theme}
                onUpdate={(val) => setTheme(val as 'light' | 'dark')}
              >
                <SegmentedRadioGroup.Option value="light">
                  <Icon data={Sun} size={16} />
                </SegmentedRadioGroup.Option>
                <SegmentedRadioGroup.Option value="dark">
                  <Icon data={Moon} size={16} />
                </SegmentedRadioGroup.Option>
              </SegmentedRadioGroup>
              {!compact && (
                <Select
                  size="m"
                  value={[lang]}
                  options={LANG_OPTIONS}
                  onUpdate={(value) => setLang(value[0] as AppLang)}
                  width={70}
                />
              )}
            </div>
          </div>
          <main className="layout-content">
            <Outlet />
          </main>
        </div>
      )}
    />
  );
};

export default Layout;
