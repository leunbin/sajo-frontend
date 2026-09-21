import apiClient from './client';

import type { SupportAskRequest, SupportAskResponse } from '../types/support';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const askSupport = async (question: string): Promise<SupportAskResponse> => {
  const request: SupportAskRequest = {
    question,
  };

  const response = await apiClient.post<ApiResponse<SupportAskResponse>>(
    '/api/v1/support/ask',
    request
  );

  return response.data.data;
};
