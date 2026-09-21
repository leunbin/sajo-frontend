import apiClient from './client';
import type { ApiResponse } from '../types/market';
import type {
  StrategyCreateRequest,
  StrategyCreateResponse,
  StrategyDetail,
  StrategyStatus,
  StrategyListResponse,
  StrategyActivationResponse,
  StrategyUpdateRequest,
  StrategyUpdateResponse,
} from '../types/strategy';

export const createStrategy = async (
  request: StrategyCreateRequest
): Promise<StrategyCreateResponse> => {
  const response = await apiClient.post<ApiResponse<StrategyCreateResponse>>(
    '/api/v1/strategies',
    request
  );

  return response.data.data;
};

export const getStrategy = async (strategyId: string): Promise<StrategyDetail> => {
  const response = await apiClient.get<ApiResponse<StrategyDetail>>(
    `/api/v1/strategies/${strategyId}`
  );

  return response.data.data;
};

export const getStrategies = async (
  page = 0,
  size = 10,
  status?: StrategyStatus
): Promise<StrategyListResponse> => {
  const response = await apiClient.get<ApiResponse<StrategyListResponse>>('/api/v1/strategies', {
    params: {
      page,
      size,
      ...(status ? { status } : {}),
    },
  });

  return response.data.data;
};

export const updateStrategyActivation = async (
  strategyId: string,
  active: boolean
): Promise<StrategyActivationResponse> => {
  const response = await apiClient.patch<ApiResponse<StrategyActivationResponse>>(
    `/api/v1/strategies/${strategyId}/activation`,
    {
      active,
    }
  );

  return response.data.data;
};

export const updateStrategy = async (
  strategyId: string,
  request: StrategyUpdateRequest
): Promise<StrategyUpdateResponse> => {
  const response = await apiClient.patch<ApiResponse<StrategyUpdateResponse>>(
    `/api/v1/strategies/${strategyId}`,
    request
  );

  return response.data.data;
};

export const deleteStrategy = async (strategyId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/strategies/${strategyId}`);
};
