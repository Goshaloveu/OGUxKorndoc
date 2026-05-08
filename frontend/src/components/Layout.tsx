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
  FaceRobot,
  House,
} from '@gravity-ui/icons';
import { useAuth } from '../hooks/useAuth';
import { useThemeContext } from '../hooks/useTheme';
import type { AppLang } from '../hooks/useTheme';
import { useTranslation } from '../i18n';
import NotificationBell from './NotificationBell';
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
  const t = useTranslation('app');
  const tLayout = useTranslation('layout');
  const [compact, setCompactState] = useState(loadCompact);

  const handleCompact = (v: boolean) => {
    setCompactState(v);
    localStorage.setItem(COMPACT_KEY, String(v));
  };

  if (isLoading) {
    return (
      <div className="layout-loading">
        <Text variant="body-1">{t('loading')}</Text>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    {
      id: 'home',
      title: t('home'),
      icon: House,
      current: isActive('/'),
      onItemClick: () => navigate('/'),
    },
    {
      id: 'search',
      title: t('search'),
      icon: Magnifier,
      current: isActive('/search'),
      onItemClick: () => navigate('/search'),
    },
    {
      id: 'upload',
      title: t('upload'),
      icon: ArrowUpFromLine,
      current: isActive('/upload'),
      onItemClick: () => navigate('/upload'),
    },
    {
      id: 'documents',
      title: t('documents'),
      icon: Folder,
      current: isActive('/documents'),
      onItemClick: () => navigate('/documents'),
    },
    {
      id: 'ai',
      title: t('aiAssistant'),
      icon: FaceRobot,
      current: isActive('/ai'),
      onItemClick: () => navigate('/ai'),
    },
    {
      id: 'profile',
      title: t('profile'),
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
            title: t('administration'),
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
        text: t('brand'),
        iconSrc: '/logo.svg',
        iconSize: 32,
        href: '/',
        onClick: () => navigate('/'),
      }}
      compact={compact}
      onChangeCompact={handleCompact}
      headerDecoration
      menuItems={menuItems}
      renderFooter={({ compact: isCompact }) => (
        <div className="layout-footer">
          {!isCompact && user && (
            <div className="layout-footer-user">
              <Text variant="caption-2" color="secondary">
                {user.username}
              </Text>
              <Text variant="caption-2" color="hint">
                {user.role === 'admin' ? t('admin') : t('user')}
              </Text>
            </div>
          )}
          <FooterItem
            id="faq"
            title={tLayout('faq')}
            icon={CircleQuestion}
            compact={isCompact}
            current={isActive('/faq')}
            onItemClick={() => navigate('/faq')}
          />
          <FooterItem
            id="settings"
            title={t('settings')}
            icon={Gear}
            compact={isCompact}
            current={isActive('/settings')}
            onItemClick={() => navigate('/settings')}
          />
          <FooterItem
            id="logout"
            title={t('logout')}
            icon={ArrowRightFromSquare}
            compact={isCompact}
            onItemClick={logout}
          />
        </div>
      )}
      renderContent={() => (
        <div className="layout-main">
          <div className="layout-header">
            <div className="layout-header-right">
              <NotificationBell />
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
              <Select
                size="m"
                value={[lang]}
                options={LANG_OPTIONS}
                onUpdate={(value) => setLang(value[0] as AppLang)}
                width={70}
              />
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
