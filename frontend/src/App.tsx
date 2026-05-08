import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import BackgroundTaskMonitor from './components/BackgroundTaskMonitor';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import UploadPage from './pages/UploadPage';
import DocumentsPage from './pages/DocumentsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import AIAssistantPage from './pages/AIAssistantPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        {/*
          BackgroundTaskMonitor lives here: inside auth guard (has token)
          but ABOVE Layout, so it never unmounts on navigation.
          Component tree:
            NotificationProvider (main.tsx)
            └─ BackgroundTaskMonitor  ← global polling
               └─ Layout
                  └─ NotificationBell (in header)
                  └─ <Routes> / UploadPage (only registers tasks)
        */}
        <Route
          element={
            <>
              <BackgroundTaskMonitor />
              <Layout />
            </>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ai" element={<AIAssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/faq" element={<FAQPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
