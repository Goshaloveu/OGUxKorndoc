import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import UploadPage from './pages/UploadPage';
import DocumentsPage from './pages/DocumentsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<SearchPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
