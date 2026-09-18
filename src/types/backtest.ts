export type BacktestStatus = 'REQUESTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface BacktestCreateRequest {
  startDate: string;
  endDate: string;
  initialCash: number;
}

export interface BacktestCreateResponse {
  backtestId: string;
  strategyId: string;
  status: BacktestStatus;
  requestedAt: string;
}

export interface BacktestStatusResponse {
  backtestId: string;
  status: BacktestStatus;
}

export interface BacktestDetail {
  backtestId: string;
  strategyId: string;
  stockCode: string;

  startDate: string;
  endDate: string;
  initialCash: number;

  status: BacktestStatus;

  totalReturnRate: number | null;
  mdd: number | null;
  winRate: number | null;
  tradeCount: number | null;
  maxConsecutiveLosses: number | null;

  requestedAt: string;
}

export interface BacktestSummary {
  backtestId: string;
  stockCode: string;

  startDate: string;
  endDate: string;

  status: BacktestStatus;

  totalReturnRate: number | null;
  mdd: number | null;

  requestedAt: string;
}

export interface BacktestListResponse {
  backtests: BacktestSummary[];
  page: number;
  size: number;
  totalElements: number;
}
