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

export interface Execution {
  executionId: string;
  orderId: string;
  autoTradingId: string;
  strategyId: string;
  brokerOrderNo: string | null;
  executedQuantity: number;
  averageExecutionPrice: number;
  totalExecutionAmount: number;
  remainingQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionSearchParams {
  orderId?: string;
  autoTradingId?: string;
  strategyId?: string;
  page?: number;
  size?: number;
}
