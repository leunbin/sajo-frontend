export type AccountType = 'REAL' | 'VIRTUAL';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Account {
  id: string;
  accountNo: string;
  accountType: AccountType;
}

export interface AccountCreateRequest {
  appKey: string;
  secretKey: string;
  accountNo: string;
  accountType: AccountType;
}

export interface AccountDeposit {
  depositTotal: number;
  d1Deposit: number;
  d2Deposit: number;
  totalEvaluationAmount: number;
  netAssetAmount: number;
  totalProfitLoss: number;
  asOf: string;
}

export interface AccountHolding {
  stockCode: string;
  stockName: string;
  quantity: number;
  sellableQuantity: number;
  avgPurchasePrice: number;
  currentPrice: number;
  evaluationAmount: number;
  profitLossAmount: number;
  profitLossRate: number;
}

export interface AccountHoldings {
  holdings: AccountHolding[];
  hasNext: boolean;
  nextCtxAreaFk100: string | null;
  nextCtxAreaNk100: string | null;
  asOf: string;
}
