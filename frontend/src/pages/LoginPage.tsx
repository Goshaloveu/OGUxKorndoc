import React from 'react';
import { Text } from '@gravity-ui/uikit';

const LoginPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <Text variant="header-1">Вход — реализуется в TASK-012</Text>
    </div>
  );
};

export default LoginPage;
