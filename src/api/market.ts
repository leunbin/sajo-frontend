import apiClient from './client';
import type {
  ApiResponse,
  MarketStock,
  MarketStockSearch,
  PageResponse,
  StockPrice,
  StockSummary,
} from '../types/market';

export const getStocks = async (page = 0, size = 10): Promise<PageResponse<MarketStock>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<MarketStock>>>(
    '/api/v1/market/stocks',
    {
      params: {
        page,
        size,
      },
    }
  );

  return response.data.data;
};

export const searchStocks = async (
  keyword: string,
  page = 0,
  size = 10
): Promise<PageResponse<MarketStockSearch>> => {
  const response = await apiClient.get<ApiResponse<PageResponse<MarketStockSearch>>>(
    '/api/v1/market/stocks/search',
    {
      params: {
        keyword,
        page,
        size,
      },
    }
  );

  return response.data.data;
};

export const getStockSummary = async (stockCode: string): Promise<StockSummary> => {
  const response = await apiClient.get<ApiResponse<StockSummary>>(
    `/api/v1/market/stocks/${stockCode}/summary`
  );

  return response.data.data;
};

export const getStockChart = async (stockCode: string, days = 30): Promise<StockPrice[]> => {
  const response = await apiClient.get<ApiResponse<StockPrice[]>>(
    `/api/v1/market/stocks/${stockCode}/chart`,
    {
      params: {
        days,
      },
    }
  );

  return response.data.data;
};
