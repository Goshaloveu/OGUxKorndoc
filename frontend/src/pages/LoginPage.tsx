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
        background: 'var(--g-color-base-background)',
      }}
    >
      <Card
        style={{
          width: 380,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <Text variant="header-2" style={{ textAlign: 'center' }}>
          Корпоративный поиск
        </Text>
        <Text variant="body-2" color="secondary" style={{ textAlign: 'center' }}>
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
            size="l"
            width="max"
            loading={mutation.isPending}
            disabled={!email || !password}
          >
            Войти
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
