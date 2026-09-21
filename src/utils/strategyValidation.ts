interface StrategyValidationState {
  invalidatedAt: string;
}

const getStrategyValidationKey = (strategyId: string) => `sajo:strategy-validation:${strategyId}`;

export const invalidateStrategyValidation = (strategyId: string): void => {
  const state: StrategyValidationState = {
    invalidatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getStrategyValidationKey(strategyId), JSON.stringify(state));
};

export const needsStrategyRevalidation = (strategyId: string): boolean => {
  return localStorage.getItem(getStrategyValidationKey(strategyId)) !== null;
};

export const completeStrategyRevalidation = (strategyId: string): void => {
  localStorage.removeItem(getStrategyValidationKey(strategyId));
};

export const getStrategyValidationState = (strategyId: string): StrategyValidationState | null => {
  const value = localStorage.getItem(getStrategyValidationKey(strategyId));

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StrategyValidationState;
  } catch {
    localStorage.removeItem(getStrategyValidationKey(strategyId));

    return null;
  }
};
