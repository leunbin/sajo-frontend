import apiClient from './client';

import type {
  ApiResponse,
  OrderDetail,
  OrderListItem,
  OrderSearchParams,
  PageResponse,
} from '../types/order';

export const getOrders = async (
  params: OrderSearchParams = {}
): Promise<PageResponse<OrderListItem>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<OrderListItem>>>('/api/v1/orders', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 10,
      autoTradingId: params.autoTradingId,
      strategyId: params.strategyId,
      status: params.status,
      stockCode: params.stockCode,
      orderType: params.orderType,
    },
  });

  return response.data.data;
};

export const getOrderDetail = async (orderId: string): Promise<OrderDetail> => {
  const response = await apiClient.get<ApiResponse<OrderDetail>>(`/api/v1/orders/${orderId}`);

  return response.data.data;
};
