import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const DEFAULT_API_BASE_URL = 'https://mercado-backend-gtke7r7veq-rj.a.run.app/api';
const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL;

type SessionResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: unknown;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _sessionRetry?: boolean;
};

let refreshRequest: Promise<string> | null = null;

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

function shouldRefresh(config: RetriableRequestConfig | undefined) {
  const path = config?.url ?? '';
  return !['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password']
    .some((authPath) => path.includes(authPath));
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('Refresh token unavailable');
  }

  if (!refreshRequest) {
    refreshRequest = axios.post<SessionResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      }
    ).then(({ data }) => {
      if (!data.access_token) {
        throw new Error('Invalid refreshed session');
      }

      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return data.access_token;
    }).finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableRequestConfig | undefined;
    const hasSession = Boolean(localStorage.getItem('token'));

    if (error.response?.status !== 401 || !hasSession || !config || config._sessionRetry || !shouldRefresh(config)) {
      return Promise.reject(error);
    }

    config._sessionRetry = true;

    try {
      const accessToken = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    } catch (refreshError) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
