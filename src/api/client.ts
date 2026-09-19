// src/api/client.ts

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { LoginResponse } from '../types/auth';
import { tokenStorage } from '../utils/tokenStorage';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const clientConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
};

export const publicClient = axios.create(clientConfig);

const apiClient = axios.create(clientConfig);

let refreshPromise: Promise<LoginResponse> | null = null;

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

const refreshTokens = async (): Promise<LoginResponse> => {
  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    throw new Error('Refresh token does not exist.');
  }

  const response = await publicClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/refresh', {
    refreshToken,
  });

  const tokens = response.data.data;

  tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);

  return tokens;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
          refreshPromise = null;
        });
      }

      const tokens = await refreshPromise;

      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      tokenStorage.clearTokens();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
