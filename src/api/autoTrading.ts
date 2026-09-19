import apiClient from './client';

import type {
  ApiResponse,
  AutoTrading,
  AutoTradingCreateRequest,
  AutoTradingUpdateRequest,
  PageResponse,
  TradingLimit,
  TradingLimitRequest,
  TradingLimitUpdateRequest,
} from '../types/autoTrading';

export const createAutoTrading = async (
  request: AutoTradingCreateRequest
): Promise<AutoTrading> => {
  const response = await apiClient.post<ApiResponse<AutoTrading>>('/api/v1/auto-tradings', request);

  return response.data.data;
};

export const getAutoTradings = async (page = 0, size = 100): Promise<PageResponse<AutoTrading>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<AutoTrading>>>(
    '/api/v1/auto-tradings',
    {
      params: {
        page,
        size,
      },
    }
  );

  return response.data.data;
};

export const getAutoTrading = async (autoTradingId: string): Promise<AutoTrading> => {
  const response = await apiClient.get<ApiResponse<AutoTrading>>(
    `/api/v1/auto-tradings/${autoTradingId}`
  );

  return response.data.data;
};

export const updateAutoTrading = async (
  autoTradingId: string,
  request: AutoTradingUpdateRequest
): Promise<AutoTrading> => {
  const response = await apiClient.patch<ApiResponse<AutoTrading>>(
    `/api/v1/auto-tradings/${autoTradingId}`,
    request
  );

  return response.data.data;
};

export const deleteAutoTrading = async (autoTradingId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/auto-tradings/${autoTradingId}`);
};

export const createTradingLimit = async (request: TradingLimitRequest): Promise<TradingLimit> => {
  const response = await apiClient.post<ApiResponse<TradingLimit>>(
    '/api/v1/trading-limits',
    request
  );

  return response.data.data;
};

export const getTradingLimit = async (): Promise<TradingLimit> => {
  const response = await apiClient.get<ApiResponse<TradingLimit>>('/api/v1/trading-limits');

  return response.data.data;
};

export const updateTradingLimit = async (
  request: TradingLimitUpdateRequest
): Promise<TradingLimit> => {
  const response = await apiClient.patch<ApiResponse<TradingLimit>>(
    '/api/v1/trading-limits',
    request
  );

  return response.data.data;
};
