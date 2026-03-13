export interface User {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
}

export interface ApiError {
  detail: string;
}
