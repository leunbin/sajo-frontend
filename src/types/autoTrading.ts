export type AutoTradingDirection = 'BUY_ONLY' | 'SELL_ONLY' | 'BOTH';

export type AutoTradingOrderStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'ACCEPTED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'PARTIALLY_FILLED_REJECTED';

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
}

export interface AutoTradingCreateRequest {
  strategyId: string;
  direction: AutoTradingDirection;
}

export interface AutoTradingUpdateRequest {
  enabled?: boolean;
  direction?: AutoTradingDirection;
}

export interface AutoTrading {
  autoTradingId: string;
  strategyId: string;
  direction: AutoTradingDirection;
  enabled: boolean;

  latestOrderId: string | null;
  latestOrderStatus: AutoTradingOrderStatus | null;
  latestOrderCreatedAt: string | null;
  latestFailureCode: string | null;
  latestFailureMessage: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface TradingLimitRequest {
  dailyMaxOrderAmount: number;
  dailyMaxOrderCount: number;
  dailyLossLimitRate: number;
}

export interface TradingLimitUpdateRequest {
  dailyMaxOrderAmount?: number;
  dailyMaxOrderCount?: number;
  dailyLossLimitRate?: number;
}

export interface TradingLimit {
  tradingLimitId: string;
  dailyMaxOrderAmount: number;
  dailyMaxOrderCount: number;
  dailyLossLimitRate: number;
  createdAt: string;
  updatedAt: string;
}
