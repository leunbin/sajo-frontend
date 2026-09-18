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

export interface MarketStock {
  stockCode: string;
  stockName: string;
  marketType: string;
  industryCode: string | null;
  listedShares: number | null;
  marketCap: number | null;
}

export interface MarketStockSearch extends MarketStock {
  stockId: string;
}

export interface StockQuote {
  stockCode: string;
  currentPrice: number | null;
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  previousClosePrice: number | null;
  changePrice: number | null;
  changeRate: number | null;
  accumulatedVolume: number | null;
  tradeAmount: number | null;
  marketCapitalization: number | null;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
}

export interface StockIndicator {
  referenceDate: string | null;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  valuationFetchedAt: string | null;
  financialPeriodType: string | null;
  financialReferenceYearMonth: string | null;
  financialFetchedAt: string | null;
}

export interface StockSummary {
  stock: MarketStock;
  quote: StockQuote;
  indicator: StockIndicator | null;
}

export interface StockPrice {
  tradeDate: string;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  accumulatedVolume: number;
  accumulatedTradeAmount: number;
}
