import apiClient from './client';

import type { ApiResponse } from '../types/market';
import type {
  BacktestCreateRequest,
  BacktestCreateResponse,
  BacktestDetail,
  BacktestListResponse,
  BacktestStatusResponse,
} from '../types/backtest';

export const createBacktest = async (
  strategyId: string,
  request: BacktestCreateRequest
): Promise<BacktestCreateResponse> => {
  const response = await apiClient.post<ApiResponse<BacktestCreateResponse>>(
    `/api/v1/strategies/${strategyId}/backtests`,
    request
  );

  return response.data.data;
};

export const getBacktestStatus = async (
  strategyId: string,
  backtestId: string
): Promise<BacktestStatusResponse> => {
  const response = await apiClient.get<ApiResponse<BacktestStatusResponse>>(
    `/api/v1/strategies/${strategyId}/backtests/${backtestId}/status`
  );

  return response.data.data;
};

export const getBacktestDetail = async (
  strategyId: string,
  backtestId: string
): Promise<BacktestDetail> => {
  const response = await apiClient.get<ApiResponse<BacktestDetail>>(
    `/api/v1/strategies/${strategyId}/backtests/${backtestId}`
  );

  return response.data.data;
};

export const getBacktests = async (
  strategyId: string,
  page = 0,
  size = 10
): Promise<BacktestListResponse> => {
  const response = await apiClient.get<ApiResponse<BacktestListResponse>>(
    `/api/v1/strategies/${strategyId}/backtests`,
    {
      params: {
        page,
        size,
      },
    }
  );

  return response.data.data;
};
