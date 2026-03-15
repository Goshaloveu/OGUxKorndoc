import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Text, TextInput, Alert } from '@gravity-ui/uikit';
import { loginUser } from '../api/auth';
import type { LoginRequest } from '../api/auth';
import axios from 'axios';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: (credentials: LoginRequest) => loginUser(credentials),
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token);
      queryClient.setQueryData(['me'], data.user);
      navigate('/', { replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    mutation.mutate({ email, password });
  };

  const errorMessage = mutation.isError
    ? axios.isAxiosError(mutation.error) && mutation.error.response?.status === 401
      ? 'Неверный email или пароль'
      : 'Ошибка подключения к серверу'
    : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a3020 50%, #1a2a10 100%)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: 'var(--g-color-base-brand)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              boxShadow: '0 8px 32px rgba(203, 255, 92, 0.3)',
            }}
          >
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text
              variant="header-2"
              style={{ color: '#ffffff', display: 'block', fontWeight: 700, letterSpacing: -0.5 }}
            >
              КорнДок
            </Text>
            <Text
              variant="body-2"
              style={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}
            >
              Корпоративное хранилище документов
            </Text>
          </div>
        </div>

        {/* Login card */}
        <Card
          style={{
            width: 400,
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          }}
        >
          <Text variant="subheader-3" style={{ textAlign: 'center', color: 'var(--g-color-text-secondary)' }}>
            Войдите в систему
          </Text>

          {errorMessage && (
            <Alert theme="danger" message={errorMessage} />
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <TextInput
              label="Email"
              type="email"
              size="l"
              value={email}
              onUpdate={setEmail}
              placeholder="admin@company.com"
              autoComplete="email"
              disabled={mutation.isPending}
            />

            <TextInput
              label="Пароль"
              type="password"
              size="l"
              value={password}
              onUpdate={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={mutation.isPending}
            />

            <Button
              type="submit"
              view="action"
              size="xl"
              width="max"
              loading={mutation.isPending}
              disabled={!email || !password}
            >
              Войти
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
