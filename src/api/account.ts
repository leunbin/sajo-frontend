import axios from 'axios';

import apiClient from './client';

import type {
  Account,
  AccountCreateRequest,
  AccountDeposit,
  AccountHoldings,
  ApiResponse,
} from '../types/account';

export const getMyAccount = async (): Promise<Account | null> => {
  try {
    const response = await apiClient.get<ApiResponse<Account>>('/api/v1/accounts/me');

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
};

export const createAccount = async (request: AccountCreateRequest): Promise<Account> => {
  const response = await apiClient.post<ApiResponse<Account>>('/api/v1/accounts', request);

  return response.data.data;
};

export const deleteAccount = async (): Promise<void> => {
  await apiClient.delete('/api/v1/accounts');
};

export const getAccountDeposit = async (): Promise<AccountDeposit> => {
  const response = await apiClient.get<ApiResponse<AccountDeposit>>('/api/v1/accounts/me/deposit');

  return response.data.data;
};

export const getAccountHoldings = async (
  ctxAreaFk100?: string,
  ctxAreaNk100?: string
): Promise<AccountHoldings> => {
  const response = await apiClient.get<ApiResponse<AccountHoldings>>(
    '/api/v1/accounts/me/holdings',
    {
      params: {
        ctxAreaFk100,
        ctxAreaNk100,
      },
    }
  );

  return response.data.data;
};
