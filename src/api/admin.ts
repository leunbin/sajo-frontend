import apiClient from './client';

import type {
  AdminAutoTrading,
  AdminOrder,
  AiAnalysisFailureType,
  AiAuditDetail,
  AiFailureHistoryItem,
  AiPromptVersion,
  AiPromptVersionCreateRequest,
  AiPromptVersionCreateResponse,
  ApiResponse,
  GlobalSuspension,
  PageResponse,
} from '../types/admin';

export const getAdminAutoTradings = async (
  page = 0,
  size = 20
): Promise<PageResponse<AdminAutoTrading>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<AdminAutoTrading>>>(
    '/api/v1/admin/trading/auto-tradings',
    {
      params: {
        page,
        size,
        sort: 'createdAt,desc',
      },
    }
  );

  return response.data.data;
};

export const getGlobalSuspension = async (): Promise<GlobalSuspension> => {
  const response = await apiClient.get<ApiResponse<GlobalSuspension>>(
    '/api/v1/admin/trading/auto-tradings/suspensions'
  );

  return response.data.data;
};

export const updateGlobalSuspension = async (suspended: boolean): Promise<void> => {
  await apiClient.patch('/api/v1/admin/trading/auto-tradings/suspensions', {
    suspended,
  });
};

export const updateAutoTradingSuspension = async (
  autoTradingId: string,
  suspended: boolean
): Promise<void> => {
  await apiClient.patch(`/api/v1/admin/trading/auto-tradings/${autoTradingId}/suspensions`, {
    suspended,
  });
};

export const getAdminOrders = async (page = 0, size = 20): Promise<PageResponse<AdminOrder>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<AdminOrder>>>(
    '/api/v1/admin/trading/orders',
    {
      params: {
        page,
        size,
        sort: 'createdAt,desc',
      },
    }
  );

  return response.data.data;
};

export const getAiFailureHistory = async (
  page = 0,
  size = 20,
  failureType?: AiAnalysisFailureType
): Promise<PageResponse<AiFailureHistoryItem>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<AiFailureHistoryItem>>>(
    '/api/v1/admin/ai/analyses/failures',
    {
      params: {
        page,
        size,
        failureType: failureType || undefined,
        sort: 'createdAt,desc',
      },
    }
  );

  return response.data.data;
};

export const getAiAuditDetail = async (analysisId: string): Promise<AiAuditDetail> => {
  const response = await apiClient.get<ApiResponse<AiAuditDetail>>(
    `/api/v1/admin/ai/analyses/${analysisId}/audit`
  );

  return response.data.data;
};

export const getPromptVersions = async (
  page = 0,
  size = 20
): Promise<PageResponse<AiPromptVersion>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<AiPromptVersion>>>(
    '/api/v1/admin/ai/prompt-versions',
    {
      params: {
        page,
        size,
        sort: 'deployedAt,desc',
      },
    }
  );

  return response.data.data;
};

export const createPromptVersion = async (
  request: AiPromptVersionCreateRequest
): Promise<AiPromptVersionCreateResponse> => {
  const response = await apiClient.post<ApiResponse<AiPromptVersionCreateResponse>>(
    '/api/v1/admin/ai/prompt-versions',
    request
  );

  return response.data.data;
};
