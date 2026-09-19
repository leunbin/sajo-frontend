export type AdminTab = 'AUTO_TRADING' | 'ORDERS' | 'AI';

export type AutoTradingDirection = 'BOTH' | 'BUY_ONLY' | 'SELL_ONLY';

export type OrderType = 'BUY' | 'SELL';

export type OrderStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'ACCEPTED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'PARTIALLY_FILLED_REJECTED';

export type AiAnalysisFailureType =
  | 'LLM_API_ERROR'
  | 'RESPONSE_PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'PROMPT_NOT_FOUND';

export type AiAnalysisStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

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

export interface AdminAutoTrading {
  autoTradingId: string;
  userId: string;
  strategyId: string;
  direction: AutoTradingDirection;
  enabled: boolean;
  adminSuspended: boolean;

  latestOrderId: string | null;
  latestOrderStatus: OrderStatus | null;
  latestOrderCreatedAt: string | null;
  latestFailureCode: string | null;
  latestFailureMessage: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface GlobalSuspension {
  suspended: boolean;
}

export interface AdminOrder {
  orderId: string;
  userId: string;
  autoTradingId: string;
  strategyId: string;
  signalId: string;

  stockCode: string;
  orderType: OrderType;

  signalPrice: number;
  orderQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  estimatedOrderAmount: number;

  status: OrderStatus;

  brokerOrderNo: string | null;
  failureCode: string | null;
  failureMessage: string | null;

  accountRetryCount: number;
  marketRetryCount: number;
  reconciliationRetryCount: number;

  lastExecutionCheckedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface AiFailureHistoryItem {
  analysisId: string;
  userId: string;
  strategyId: string;
  backtestId: string;

  failureType: AiAnalysisFailureType;
  failureMessage: string | null;

  createdAt: string;
}

export interface AiAuditPrompt {
  promptKey: string;
  version: string;
  content: string;
}

export interface AiAuditLlmResponse {
  rawResponse: string;
}

export interface AiAuditValidation {
  structureValid: boolean;
  contentValid: boolean;
  errors: string[];
}

export interface AiAuditMetadata {
  model: string;
  latencyMs: number;
}

export interface AiAuditResult {
  status: AiAnalysisStatus;
  failureType: AiAnalysisFailureType | null;
}

export interface AiAuditDetail {
  analysisId: string;
  userId: string;
  strategyId: string;
  backtestId: string;

  requestSnapshot: Record<string, unknown>;

  prompt: AiAuditPrompt | null;
  response: AiAuditLlmResponse | null;
  validation: AiAuditValidation | null;
  metadata: AiAuditMetadata | null;
  result: AiAuditResult | null;

  createdAt: string;
}

export type AiPromptKey = 'STRATEGY_RISK_ANALYSIS' | 'BACKTEST_ANALYSIS';

export type AiPromptStatus = 'ACTIVE' | 'RETIRED';

export interface AiPromptVersionCreateRequest {
  promptKey: AiPromptKey;
  promptContent: string;
  changeSummary?: string;
}

export interface AiPromptVersionCreateResponse {
  id: string;
  promptKey: AiPromptKey;
  version: string;
  status: AiPromptStatus;
  deployedAt: string;
}

export interface AiPromptVersion {
  id: string;
  promptKey: AiPromptKey;
  version: string;
  status: AiPromptStatus;

  deployedAt: string;
  retiredAt: string | null;

  totalCount: number;
  failedCount: number;
  failureRate: number;

  failureTypeCounts: Partial<Record<AiAnalysisFailureType, number>>;
}
