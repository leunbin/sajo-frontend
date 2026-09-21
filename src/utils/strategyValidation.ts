export interface StrategyValidationState {
  invalidatedAt: string;
  backtestId: string | null;
}

const getStrategyValidationKey = (strategyId: string) => `sajo:strategy-validation:${strategyId}`;

export const invalidateStrategyValidation = (strategyId: string): void => {
  const state: StrategyValidationState = {
    invalidatedAt: new Date().toISOString(),
    backtestId: null,
  };

  localStorage.setItem(getStrategyValidationKey(strategyId), JSON.stringify(state));
};

export const getStrategyValidationState = (strategyId: string): StrategyValidationState | null => {
  const value = localStorage.getItem(getStrategyValidationKey(strategyId));

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StrategyValidationState>;

    return {
      invalidatedAt:
        typeof parsed.invalidatedAt === 'string' ? parsed.invalidatedAt : new Date().toISOString(),
      backtestId: typeof parsed.backtestId === 'string' ? parsed.backtestId : null,
    };
  } catch {
    localStorage.removeItem(getStrategyValidationKey(strategyId));
    return null;
  }
};

export const needsStrategyRevalidation = (strategyId: string): boolean =>
  getStrategyValidationState(strategyId) !== null;

export const setRevalidationBacktest = (strategyId: string, backtestId: string): void => {
  const state = getStrategyValidationState(strategyId);

  if (!state) {
    return;
  }

  localStorage.setItem(
    getStrategyValidationKey(strategyId),
    JSON.stringify({
      ...state,
      backtestId,
    })
  );
};

export const completeStrategyRevalidation = (strategyId: string): void => {
  localStorage.removeItem(getStrategyValidationKey(strategyId));
};
