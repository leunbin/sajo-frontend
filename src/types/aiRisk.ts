export type AiAnalysisStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type AiAnalysisFailureType =
  | 'LLM_API_ERROR'
  | 'RESPONSE_PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'PROMPT_NOT_FOUND';

export type RiskFactorType =
  | 'MAX_DRAWDOWN'
  | 'CONSECUTIVE_LOSS'
  | 'LOW_WIN_RATE'
  | 'LOW_TRADE_COUNT'
  | 'STOP_LOSS_RISK'
  | 'FINANCIAL_INDICATOR_RISK';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface RiskFactor {
  type: RiskFactorType;
  description: string;
}

export interface AiRiskAnalysisCreateRequest {
  strategyId: string;
  backtestId: string;
}

export interface AiRiskAnalysisCreateResponse {
  analysisId: string;
  status: AiAnalysisStatus;
}

export interface AiRiskAnalysisDetail {
  analysisId: string;
  strategyId: string;
  backtestId: string;
  status: AiAnalysisStatus;
  riskLevel: RiskLevel | null;
  summary: string | null;
  riskFactors: RiskFactor[] | null;
  reasoning: string | null;
  recommendations: string[] | null;
  failureType: AiAnalysisFailureType | null;
  message: string;
}

export interface AiRiskAnalysisHistoryItem {
  analysisId: string;
  strategyId: string;
  backtestId: string;
  status: AiAnalysisStatus;
  riskLevel: RiskLevel | null;
  summary: string | null;
  createdAt: string;
}
