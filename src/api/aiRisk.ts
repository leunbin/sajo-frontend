import apiClient from './client';

import type {
  AiRiskAnalysisCreateRequest,
  AiRiskAnalysisCreateResponse,
  AiRiskAnalysisDetail,
  AiRiskAnalysisHistoryItem,
  PageResponse,
  ApiResponse,
} from '../types/aiRisk';

export const createAiRiskAnalysis = async (
  request: AiRiskAnalysisCreateRequest
): Promise<AiRiskAnalysisCreateResponse> => {
  const response = await apiClient.post<ApiResponse<AiRiskAnalysisCreateResponse>>(
    '/api/v1/ai/analyses',
    request
  );

  return response.data.data;
};

export const getAiRiskAnalysis = async (analysisId: string): Promise<AiRiskAnalysisDetail> => {
  const response = await apiClient.get<ApiResponse<AiRiskAnalysisDetail>>(
    `/api/v1/ai/analyses/${analysisId}`
  );

  return response.data.data;
};

export const getAiRiskAnalysisHistory = async (
  page = 0,
  size = 10
): Promise<PageResponse<AiRiskAnalysisHistoryItem>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<AiRiskAnalysisHistoryItem>>>(
    '/api/v1/ai/analyses',
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
