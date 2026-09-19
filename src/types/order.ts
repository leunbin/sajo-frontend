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

export interface OrderListItem {
  orderId: string;
  autoTradingId: string;
  strategyId: string;
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

  createdAt: string;
}

export interface OrderDetail {
  orderId: string;
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

  createdAt: string;
  updatedAt: string;
}

export interface OrderSearchParams {
  autoTradingId?: string;
  strategyId?: string;
  status?: OrderStatus;
  stockCode?: string;
  orderType?: OrderType;

  page?: number;
  size?: number;
}
