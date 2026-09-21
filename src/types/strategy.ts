export interface StrategyCreateRequest {
  stockId: string;
  stockCode: string;
  strategyName: string;
  buyConditionPrice: number;
  sellConditionPrice: number;
  stopLossRate: number;
  targetReturnRate?: number;
  allocatedAmount: number;
  orderAmount: number;
  perCondition?: number;
  pbrCondition?: number;
  roeCondition?: number;
}

export type StrategyStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

export interface StrategyCreateResponse {
  strategyId: string;
  stockId: string;
  stockCode: string;
  strategyName: string;
  buyConditionPrice: number;
  sellConditionPrice: number;
  stopLossRate: number;
  targetReturnRate: number | null;
  allocatedAmount: number;
  orderAmount: number;
  perCondition: number | null;
  pbrCondition: number | null;
  roeCondition: number | null;
  status: StrategyStatus;
  createdAt: string;
}

export interface StrategyDetail {
  strategyId: string;
  stockCode: string;
  strategyName: string;
  buyConditionPrice: number;
  sellConditionPrice: number;
  stopLossRate: number;
  targetReturnRate: number | null;
  allocatedAmount: number;
  orderAmount: number;
  perCondition: number | null;
  pbrCondition: number | null;
  roeCondition: number | null;
  status: StrategyStatus;
}

export interface StrategySummary {
  strategyId: string;
  strategyName: string;
  stockCode: string;
  status: StrategyStatus;
  allocatedAmount: number;
}

export interface StrategyListResponse {
  strategies: StrategySummary[];
  page: number;
  size: number;
  totalElements: number;
}

export interface StrategyActivationRequest {
  active: boolean;
}

export interface StrategyActivationResponse {
  strategyId: string;
  status: StrategyStatus;
  activatedAt: string | null;
}

export interface StrategyUpdateRequest {
  strategyName?: string;
  buyConditionPrice?: number;
  sellConditionPrice?: number;
  stopLossRate?: number;
  targetReturnRate?: number;
  allocatedAmount?: number;
  orderAmount?: number;
  perCondition?: number;
  pbrCondition?: number;
  roeCondition?: number;
}

export interface StrategyUpdateResponse {
  strategyId: string;
  stockCode: string;
  strategyName: string;
  buyConditionPrice: number;
  sellConditionPrice: number;
  stopLossRate: number;
  targetReturnRate: number | null;
  allocatedAmount: number;
  orderAmount: number;
  perCondition: number | null;
  pbrCondition: number | null;
  roeCondition: number | null;
  status: StrategyStatus;
}
