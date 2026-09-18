import apiClient, { publicClient } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  SignupRequest,
  UserResponse,
} from '../types/auth';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const login = async (request: LoginRequest): Promise<LoginResponse> => {
  const response = await publicClient.post<ApiResponse<LoginResponse>>(
    '/api/v1/auth/login',
    request
  );

  return response.data.data;
};

export const signup = async (request: SignupRequest): Promise<UserResponse> => {
  const response = await publicClient.post<ApiResponse<UserResponse>>('/api/v1/users', request);

  return response.data.data;
};

export const refresh = async (request: RefreshRequest): Promise<LoginResponse> => {
  const response = await publicClient.post<ApiResponse<LoginResponse>>(
    '/api/v1/auth/refresh',
    request
  );

  return response.data.data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/api/v1/auth/logout');
};
