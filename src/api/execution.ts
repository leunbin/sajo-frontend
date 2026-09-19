import apiClient from './client';

import type {
  ApiResponse,
  Execution,
  ExecutionSearchParams,
  PageResponse,
} from '../types/execution';

export const getExecutions = async (
  params: ExecutionSearchParams = {}
): Promise<PageResponse<Execution>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<Execution>>>('/api/v1/executions', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 10,
      sort: 'createdAt,desc',
      orderId: params.orderId,
      autoTradingId: params.autoTradingId,
      strategyId: params.strategyId,
    },
  });

  return response.data.data;
};

export const getExecutionDetail = async (executionId: string): Promise<Execution> => {
  const response = await apiClient.get<ApiResponse<Execution>>(`/api/v1/executions/${executionId}`);

  return response.data.data;
};
