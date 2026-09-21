import axios from 'axios';
import { AlertCircle, Check, ChevronRight, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  createAiRiskAnalysis,
  getAiRiskAnalysis,
  getAiRiskAnalysisHistory,
} from '../../api/aiRisk';
import {
  createAutoTrading,
  createTradingLimit,
  getAutoTradings,
  getTradingLimit,
  updateAutoTrading,
  updateTradingLimit,
} from '../../api/autoTrading';
import { createBacktest, getBacktestDetail, getBacktests } from '../../api/backtest';
import { getStrategy, updateStrategyActivation } from '../../api/strategy';
import StrategyManagementActions from '../../components/strategy/StrategyManagementActions';
import {
  completeStrategyRevalidation,
  needsStrategyRevalidation,
} from '../../utils/strategyValidation';

import type {
  AiRiskAnalysisDetail,
  AiRiskAnalysisHistoryItem,
  RiskFactorType,
  RiskLevel,
} from '../../types/aiRisk';
import type { AutoTrading, AutoTradingDirection, TradingLimit } from '../../types/autoTrading';
import type { BacktestDetail } from '../../types/backtest';
import type { StrategyDetail, StrategyStatus } from '../../types/strategy';

import './StrategyDetailPage.scss';

const BACKTEST_POLL_INTERVAL = 1500;
const AI_POLL_INTERVAL = 1500;
const AI_HISTORY_LOOKUP_SIZE = 100;
const AUTO_TRADING_LOOKUP_SIZE = 100;

type VerificationState = 'complete' | 'current' | 'pending';

interface BacktestForm {
  startDate: string;
  endDate: string;
  initialCash: string;
}

interface AutoTradingForm {
  direction: AutoTradingDirection;
  dailyMaxOrderAmount: string;
  dailyMaxOrderCount: string;
  dailyLossLimitRate: string;
}

function StrategyDetailPage() {
  const navigate = useNavigate();
  const { strategyId } = useParams<{ strategyId: string }>();

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [latestBacktest, setLatestBacktest] = useState<BacktestDetail | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiRiskAnalysisDetail | null>(null);

  const [autoTrading, setAutoTrading] = useState<AutoTrading | null>(null);
  const [tradingLimit, setTradingLimit] = useState<TradingLimit | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [isBacktestFormOpen, setIsBacktestFormOpen] = useState(false);
  const [isBacktestSubmitting, setIsBacktestSubmitting] = useState(false);
  const [backtestError, setBacktestError] = useState('');

  const [isAiSubmitting, setIsAiSubmitting] = useState(false);
  const [aiError, setAiError] = useState('');

  const [isStrategyActivating, setIsStrategyActivating] = useState(false);
  const [strategyActivationError, setStrategyActivationError] = useState('');

  const [isAutoTradingSubmitting, setIsAutoTradingSubmitting] = useState(false);
  const [autoTradingError, setAutoTradingError] = useState('');

  const [requiresRevalidation, setRequiresRevalidation] = useState(false);

  const backtestPollingRef = useRef(false);
  const aiPollingRef = useRef(false);

  const [backtestForm, setBacktestForm] = useState<BacktestForm>({
    startDate: '',
    endDate: '',
    initialCash: '10000000',
  });

  const [autoTradingForm, setAutoTradingForm] = useState<AutoTradingForm>({
    direction: 'BOTH',
    dailyMaxOrderAmount: '5000000',
    dailyMaxOrderCount: '10',
    dailyLossLimitRate: '5',
  });

  useEffect(() => {
    document.title = strategy?.strategyName ? `${strategy.strategyName} | SAJO` : '전략 | SAJO';
  }, [strategy?.strategyName]);

  const findExistingAnalysis = async (
    currentStrategyId: string,
    backtestId: string
  ): Promise<AiRiskAnalysisDetail | null> => {
    try {
      const history = await getAiRiskAnalysisHistory(0, AI_HISTORY_LOOKUP_SIZE);

      const matched = history.content.find(
        (item: AiRiskAnalysisHistoryItem) =>
          item.strategyId === currentStrategyId && item.backtestId === backtestId
      );

      if (!matched) {
        return null;
      }

      return await getAiRiskAnalysis(matched.analysisId);
    } catch {
      return null;
    }
  };

  const findExistingAutoTrading = async (
    currentStrategyId: string
  ): Promise<AutoTrading | null> => {
    try {
      const response = await getAutoTradings(0, AUTO_TRADING_LOOKUP_SIZE);

      return response.content.find((item) => item.strategyId === currentStrategyId) ?? null;
    } catch {
      return null;
    }
  };

  const loadTradingLimit = async (): Promise<TradingLimit | null> => {
    try {
      return await getTradingLimit();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;

        if (
          data &&
          typeof data === 'object' &&
          'errorCode' in data &&
          data.errorCode === 'AUTO_TRADING_0003'
        ) {
          return null;
        }
      }

      throw error;
    }
  };

  const pollBacktest = async (backtestId: string) => {
    if (!strategyId || backtestPollingRef.current) {
      return;
    }

    backtestPollingRef.current = true;

    try {
      while (true) {
        const result = await getBacktestDetail(strategyId, backtestId);

        setLatestBacktest(result);

        if (result.status === 'COMPLETED') {
          setBacktestError('');
          setAiAnalysis(null);

          if (needsStrategyRevalidation(strategyId)) {
            completeStrategyRevalidation(strategyId);
            setRequiresRevalidation(false);
          }

          return;
        }

        if (result.status === 'FAILED') {
          setBacktestError('백테스트를 완료하지 못했습니다.');
          return;
        }

        await wait(BACKTEST_POLL_INTERVAL);
      }
    } catch (error) {
      setBacktestError(getErrorMessage(error, '백테스트 결과를 확인하지 못했습니다.'));
    } finally {
      backtestPollingRef.current = false;
      setIsBacktestSubmitting(false);
    }
  };

  const pollAiAnalysis = async (analysisId: string) => {
    if (aiPollingRef.current) {
      return;
    }

    aiPollingRef.current = true;

    try {
      while (true) {
        const result = await getAiRiskAnalysis(analysisId);

        setAiAnalysis(result);

        if (result.status === 'COMPLETED') {
          setAiError('');
          return;
        }

        if (result.status === 'FAILED') {
          setAiError(result.message || 'AI 위험 분석을 완료하지 못했습니다.');
          return;
        }

        await wait(AI_POLL_INTERVAL);
      }
    } catch (error) {
      setAiError(getErrorMessage(error, 'AI 위험 분석 결과를 확인하지 못했습니다.'));
    } finally {
      aiPollingRef.current = false;
      setIsAiSubmitting(false);
    }
  };

  useEffect(() => {
    if (!strategyId) {
      return;
    }

    let cancelled = false;

    const loadPage = async () => {
      try {
        const validationRequired = needsStrategyRevalidation(strategyId);

        setRequiresRevalidation(validationRequired);

        const strategyResponse = await getStrategy(strategyId);

        if (cancelled) {
          return;
        }

        setStrategy(strategyResponse);

        const [existingAutoTrading, existingTradingLimit] = await Promise.all([
          findExistingAutoTrading(strategyId),
          loadTradingLimit(),
        ]);

        if (cancelled) {
          return;
        }

        setAutoTrading(existingAutoTrading);
        setTradingLimit(existingTradingLimit);

        if (existingAutoTrading) {
          setAutoTradingForm((previous) => ({
            ...previous,
            direction: existingAutoTrading.direction,
          }));
        }

        if (existingTradingLimit) {
          setAutoTradingForm((previous) => ({
            ...previous,
            dailyMaxOrderAmount: String(existingTradingLimit.dailyMaxOrderAmount),
            dailyMaxOrderCount: String(existingTradingLimit.dailyMaxOrderCount),
            dailyLossLimitRate: String(existingTradingLimit.dailyLossLimitRate),
          }));
        }

        /*
         * 전략이 수정된 경우 서버에 남아 있는 기존 백테스트와
         * AI 분석은 현재 전략의 검증 결과로 사용하지 않는다.
         *
         * 기존 데이터 자체는 삭제하지 않기 때문에 분석 이력에서는
         * 계속 조회할 수 있다.
         */
        if (validationRequired) {
          setLatestBacktest(null);
          setAiAnalysis(null);
          setIsBacktestFormOpen(true);
          return;
        }

        const backtestList = await getBacktests(strategyId, 0, 1);

        if (cancelled) {
          return;
        }

        const latestSummary = backtestList.backtests[0];

        if (!latestSummary) {
          return;
        }

        const backtestDetail = await getBacktestDetail(strategyId, latestSummary.backtestId);

        if (cancelled) {
          return;
        }

        setLatestBacktest(backtestDetail);

        if (backtestDetail.status === 'REQUESTED' || backtestDetail.status === 'RUNNING') {
          void pollBacktest(backtestDetail.backtestId);
          return;
        }

        if (backtestDetail.status === 'COMPLETED') {
          const existingAnalysis = await findExistingAnalysis(
            strategyId,
            backtestDetail.backtestId
          );

          if (cancelled) {
            return;
          }

          if (existingAnalysis) {
            setAiAnalysis(existingAnalysis);

            if (existingAnalysis.status === 'PENDING') {
              void pollAiAnalysis(existingAnalysis.analysisId);
            }
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPageError(getErrorMessage(error, '전략 정보를 불러오지 못했습니다.'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [strategyId]);

  const handleBacktestSubmit = async () => {
    if (!strategyId || isBacktestSubmitting) {
      return;
    }

    if (!backtestForm.startDate || !backtestForm.endDate) {
      setBacktestError('백테스트 기간을 입력해주세요.');
      return;
    }

    const initialCash = Number(backtestForm.initialCash);

    if (!Number.isFinite(initialCash) || initialCash <= 0) {
      setBacktestError('초기 투자금을 확인해주세요.');
      return;
    }

    if (backtestForm.startDate > backtestForm.endDate) {
      setBacktestError('종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }

    try {
      setIsBacktestSubmitting(true);
      setBacktestError('');
      setAiAnalysis(null);

      const created = await createBacktest(strategyId, {
        startDate: backtestForm.startDate,
        endDate: backtestForm.endDate,
        initialCash,
      });

      const firstResult = await getBacktestDetail(strategyId, created.backtestId);

      setLatestBacktest(firstResult);
      setIsBacktestFormOpen(false);

      if (firstResult.status === 'COMPLETED') {
        if (needsStrategyRevalidation(strategyId)) {
          completeStrategyRevalidation(strategyId);
          setRequiresRevalidation(false);
        }

        setIsBacktestSubmitting(false);
        return;
      }

      if (firstResult.status === 'FAILED') {
        setBacktestError('백테스트를 완료하지 못했습니다.');
        setIsBacktestSubmitting(false);
        return;
      }

      void pollBacktest(created.backtestId);
    } catch (error) {
      setBacktestError(getErrorMessage(error, '백테스트 실행에 실패했습니다.'));

      setIsBacktestSubmitting(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (
      !strategyId ||
      requiresRevalidation ||
      !latestBacktest ||
      latestBacktest.status !== 'COMPLETED' ||
      isAiSubmitting
    ) {
      return;
    }

    try {
      setIsAiSubmitting(true);
      setAiError('');

      const created = await createAiRiskAnalysis({
        strategyId,
        backtestId: latestBacktest.backtestId,
      });

      const firstResult = await getAiRiskAnalysis(created.analysisId);

      setAiAnalysis(firstResult);

      if (firstResult.status === 'COMPLETED') {
        setIsAiSubmitting(false);
        return;
      }

      if (firstResult.status === 'FAILED') {
        setAiError(firstResult.message || 'AI 위험 분석을 완료하지 못했습니다.');
        setIsAiSubmitting(false);
        return;
      }

      void pollAiAnalysis(created.analysisId);
    } catch (error) {
      setAiError(getErrorMessage(error, 'AI 위험 분석 요청에 실패했습니다.'));

      setIsAiSubmitting(false);
    }
  };

  const handleStrategyActivation = async () => {
    if (
      !strategy ||
      requiresRevalidation ||
      latestBacktest?.status !== 'COMPLETED' ||
      aiAnalysis?.status !== 'COMPLETED' ||
      isStrategyActivating
    ) {
      return;
    }

    if (strategy.status === 'ACTIVE') {
      return;
    }

    try {
      setIsStrategyActivating(true);
      setStrategyActivationError('');

      const activation = await updateStrategyActivation(strategy.strategyId, true);

      setStrategy((previous) =>
        previous
          ? {
              ...previous,
              status: activation.status,
            }
          : previous
      );
    } catch (error) {
      setStrategyActivationError(getErrorMessage(error, '전략을 활성화하지 못했습니다.'));
    } finally {
      setIsStrategyActivating(false);
    }
  };

  const handleStrategyDeactivation = async () => {
    if (!strategy || strategy.status !== 'ACTIVE' || isStrategyActivating) {
      return;
    }

    if (autoTrading?.enabled) {
      setStrategyActivationError('자동매매를 중지한 후 전략을 비활성화할 수 있습니다.');
      return;
    }

    try {
      setIsStrategyActivating(true);
      setStrategyActivationError('');

      const activation = await updateStrategyActivation(strategy.strategyId, false);

      setStrategy((previous) =>
        previous
          ? {
              ...previous,
              status: activation.status,
            }
          : previous
      );
    } catch (error) {
      setStrategyActivationError(getErrorMessage(error, '전략을 비활성화하지 못했습니다.'));
    } finally {
      setIsStrategyActivating(false);
    }
  };

  const validateAutoTradingForm = () => {
    const dailyMaxOrderAmount = Number(autoTradingForm.dailyMaxOrderAmount);
    const dailyMaxOrderCount = Number(autoTradingForm.dailyMaxOrderCount);
    const dailyLossLimitRate = Number(autoTradingForm.dailyLossLimitRate);

    if (!Number.isFinite(dailyMaxOrderAmount) || dailyMaxOrderAmount <= 0) {
      setAutoTradingError('일 최대 주문 금액을 확인해주세요.');
      return null;
    }

    if (!Number.isInteger(dailyMaxOrderCount) || dailyMaxOrderCount <= 0) {
      setAutoTradingError('일 최대 주문 횟수를 확인해주세요.');
      return null;
    }

    if (!Number.isFinite(dailyLossLimitRate) || dailyLossLimitRate <= 0) {
      setAutoTradingError('일 손실 한도를 확인해주세요.');
      return null;
    }

    return {
      dailyMaxOrderAmount,
      dailyMaxOrderCount,
      dailyLossLimitRate,
    };
  };

  const handleAutoTradingStart = async () => {
    if (
      !strategyId ||
      !strategy ||
      requiresRevalidation ||
      latestBacktest?.status !== 'COMPLETED' ||
      aiAnalysis?.status !== 'COMPLETED' ||
      isAutoTradingSubmitting
    ) {
      return;
    }

    if (strategy.status !== 'ACTIVE') {
      setAutoTradingError('활성화된 전략만 자동매매를 시작할 수 있습니다.');
      return;
    }

    const limitValues = validateAutoTradingForm();

    if (!limitValues) {
      return;
    }

    try {
      setIsAutoTradingSubmitting(true);
      setAutoTradingError('');

      let currentLimit = tradingLimit;

      if (currentLimit) {
        currentLimit = await updateTradingLimit(limitValues);
      } else {
        currentLimit = await createTradingLimit(limitValues);
      }

      setTradingLimit(currentLimit);

      let currentAutoTrading = autoTrading;

      if (!currentAutoTrading) {
        currentAutoTrading = await createAutoTrading({
          strategyId,
          direction: autoTradingForm.direction,
        });
      } else if (currentAutoTrading.direction !== autoTradingForm.direction) {
        currentAutoTrading = await updateAutoTrading(currentAutoTrading.autoTradingId, {
          direction: autoTradingForm.direction,
        });
      }

      if (!currentAutoTrading.enabled) {
        currentAutoTrading = await updateAutoTrading(currentAutoTrading.autoTradingId, {
          enabled: true,
          direction: autoTradingForm.direction,
        });
      }

      setAutoTrading(currentAutoTrading);
    } catch (error) {
      setAutoTradingError(getErrorMessage(error, '자동매매를 시작하지 못했습니다.'));
    } finally {
      setIsAutoTradingSubmitting(false);
    }
  };

  const handleAutoTradingStop = async () => {
    if (!autoTrading || isAutoTradingSubmitting) {
      return;
    }

    try {
      setIsAutoTradingSubmitting(true);
      setAutoTradingError('');

      const updated = await updateAutoTrading(autoTrading.autoTradingId, {
        enabled: false,
      });

      setAutoTrading(updated);
    } catch (error) {
      setAutoTradingError(getErrorMessage(error, '자동매매를 중지하지 못했습니다.'));
    } finally {
      setIsAutoTradingSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="strategy-detail">
        <div className="strategy-detail__state">
          <LoaderCircle className="strategy-detail__spinner" size={24} />
          <span>전략 정보를 불러오고 있습니다.</span>
        </div>
      </main>
    );
  }

  if (pageError || !strategy) {
    return (
      <main className="strategy-detail">
        <div className="strategy-detail__state">
          <AlertCircle size={22} />
          <span>{pageError || '전략을 찾을 수 없습니다.'}</span>
        </div>
      </main>
    );
  }

  const isBacktestCompleted = !requiresRevalidation && latestBacktest?.status === 'COMPLETED';

  const isAiCompleted = !requiresRevalidation && aiAnalysis?.status === 'COMPLETED';

  const isStrategyActive = strategy.status === 'ACTIVE';

  const isAutoTradingEnabled = autoTrading?.enabled === true;

  return (
    <main className="strategy-detail">
      <header className="strategy-detail__header">
        <div>
          <h1>{strategy.strategyName}</h1>
          <p>{strategy.stockCode}</p>
        </div>

        <div className="strategy-detail__header-side">
          <span
            className={`strategy-detail__status strategy-detail__status--${strategy.status.toLowerCase()}`}
          >
            {getStrategyStatusLabel(strategy.status)}
          </span>

          <StrategyManagementActions strategy={strategy} />
        </div>
      </header>

      <section className="strategy-detail__section">
        <div className="strategy-detail__section-header">
          <h2>전략 설정</h2>
        </div>

        <div className="strategy-detail__values">
          <ValueItem label="매수 기준가" value={formatWon(strategy.buyConditionPrice)} />
          <ValueItem label="매도 기준가" value={formatWon(strategy.sellConditionPrice)} />
          <ValueItem label="전략 배정 금액" value={formatWon(strategy.allocatedAmount)} />
          <ValueItem label="1회 주문 금액" value={formatWon(strategy.orderAmount)} />
        </div>
      </section>

      <section className="strategy-detail__section">
        <div className="strategy-detail__section-header">
          <h2>투자 조건</h2>
        </div>

        <div className="strategy-detail__values strategy-detail__values--conditions">
          <ValueItem label="PER" value={formatMultiple(strategy.perCondition)} />
          <ValueItem label="PBR" value={formatMultiple(strategy.pbrCondition)} />
          <ValueItem label="ROE" value={formatPercent(strategy.roeCondition)} />
          <ValueItem label="목표 수익률" value={formatPercent(strategy.targetReturnRate)} />
          <ValueItem label="손절률" value={formatPercent(strategy.stopLossRate)} />
        </div>
      </section>

      <section className="strategy-detail__section strategy-detail__verification">
        <div className="strategy-detail__section-header">
          <div>
            <h2>전략 검증</h2>
            <p>백테스트와 위험 분석을 통해 전략을 검증할 수 있습니다.</p>
          </div>
        </div>

        <div className="strategy-detail__steps">
          <VerificationStep label="전략 설정" state="complete" />

          <VerificationLine />

          <VerificationStep label="백테스트" state={isBacktestCompleted ? 'complete' : 'current'} />

          <VerificationLine />

          <VerificationStep
            label="위험 분석"
            state={isAiCompleted ? 'complete' : isBacktestCompleted ? 'current' : 'pending'}
          />

          <VerificationLine />

          <VerificationStep
            label="전략 활성화"
            state={isStrategyActive ? 'complete' : isAiCompleted ? 'current' : 'pending'}
          />

          <VerificationLine />

          <VerificationStep
            label="자동매매"
            state={isAutoTradingEnabled ? 'complete' : isStrategyActive ? 'current' : 'pending'}
          />
        </div>
      </section>

      <section className="strategy-detail__section" id="backtest">
        <div className="strategy-detail__section-header strategy-detail__section-header--action">
          <div>
            <h2>백테스트</h2>
            <p>과거 데이터를 기준으로 전략의 성과와 손실 위험을 확인합니다.</p>
          </div>

          {latestBacktest && !isBacktestFormOpen && !requiresRevalidation && (
            <button
              type="button"
              className="strategy-detail__text-action"
              onClick={() => setIsBacktestFormOpen(true)}
            >
              다시 실행
            </button>
          )}
        </div>

        {requiresRevalidation && (
          <div className="strategy-detail__revalidation">
            <strong>전략이 수정되었습니다.</strong>

            <p>
              변경된 전략 조건으로 백테스트를 다시 실행해주세요. 이전 백테스트와 위험 분석 결과는
              분석 이력에서 확인할 수 있습니다.
            </p>
          </div>
        )}

        {!latestBacktest || isBacktestFormOpen ? (
          <BacktestFormSection
            form={backtestForm}
            setForm={setBacktestForm}
            isSubmitting={isBacktestSubmitting}
            error={backtestError}
            canCancel={latestBacktest !== null && !requiresRevalidation}
            onCancel={() => {
              setIsBacktestFormOpen(false);
              setBacktestError('');
            }}
            onSubmit={() => void handleBacktestSubmit()}
          />
        ) : (
          <BacktestResultSection backtest={latestBacktest} error={backtestError} />
        )}
      </section>

      <section className="strategy-detail__section" id="ai-analysis">
        <div className="strategy-detail__section-header">
          <div>
            <h2>AI 위험 분석</h2>
            <p>백테스트 결과를 바탕으로 전략에서 주의해야 할 위험 요인을 확인합니다.</p>
          </div>
        </div>

        {!isBacktestCompleted ? (
          <div className="strategy-detail__locked">
            <strong>백테스트 완료 후 위험 분석을 실행할 수 있습니다.</strong>
            <p>먼저 과거 데이터에 대한 전략 검증을 완료해주세요.</p>
          </div>
        ) : !aiAnalysis ? (
          <div className="strategy-detail__ai-ready">
            <div>
              <strong>백테스트가 완료되었습니다.</strong>
              <p>결과를 기반으로 전략의 위험 수준과 주요 위험 요인을 분석해보세요.</p>
            </div>

            <button
              type="button"
              disabled={isAiSubmitting || requiresRevalidation}
              onClick={() => void handleAiAnalysis()}
            >
              {isAiSubmitting ? '분석 요청 중...' : '위험 분석 시작'}
            </button>
          </div>
        ) : aiAnalysis.status === 'PENDING' ? (
          <div className="strategy-detail__processing">
            <LoaderCircle className="strategy-detail__spinner" size={22} />

            <div>
              <strong>위험 분석을 진행하고 있습니다.</strong>
              <p>백테스트 결과와 전략 조건을 분석하고 있습니다.</p>
            </div>
          </div>
        ) : aiAnalysis.status === 'FAILED' ? (
          <div className="strategy-detail__ai-failed">
            <AlertCircle size={22} />

            <div>
              <strong>위험 분석을 완료하지 못했습니다.</strong>

              <p>{aiAnalysis.message || aiError || '잠시 후 다시 시도해주세요.'}</p>

              <button
                type="button"
                disabled={isAiSubmitting || requiresRevalidation}
                onClick={() => void handleAiAnalysis()}
              >
                다시 분석
              </button>
            </div>
          </div>
        ) : (
          <AiAnalysisResult
            analysis={aiAnalysis}
            onDetail={() => navigate(`/analysis-history/ai/${aiAnalysis.analysisId}`)}
          />
        )}

        {aiError && aiAnalysis?.status !== 'FAILED' && (
          <p className="strategy-detail__inline-error">{aiError}</p>
        )}
      </section>

      <section className="strategy-detail__section strategy-detail__auto-trading" id="auto-trading">
        <div className="strategy-detail__section-header">
          <div>
            <h2>자동매매</h2>
            <p>활성화된 전략에 매매 방향과 거래 한도를 설정하고 자동매매를 시작합니다.</p>
          </div>

          {isAutoTradingEnabled && (
            <span className="strategy-detail__running">
              <span />
              실행 중
            </span>
          )}
        </div>

        {!isAiCompleted ? (
          <div className="strategy-detail__locked">
            <strong>위험 분석 완료 후 전략을 활성화할 수 있습니다.</strong>
            <p>백테스트와 AI 위험 분석 결과를 먼저 확인해주세요.</p>
          </div>
        ) : !isStrategyActive ? (
          <div className="strategy-detail__locked">
            <strong>자동매매를 사용하려면 전략 활성화가 필요합니다.</strong>

            <p>백테스트와 위험 분석 결과를 확인했다면 이 전략을 활성화할 수 있습니다.</p>

            <button
              type="button"
              className="strategy-detail__primary-button"
              disabled={isStrategyActivating || requiresRevalidation}
              onClick={() => void handleStrategyActivation()}
            >
              {isStrategyActivating ? (
                <>
                  <LoaderCircle className="strategy-detail__spinner" size={17} />
                  활성화 중
                </>
              ) : (
                '전략 활성화'
              )}
            </button>

            {strategyActivationError && (
              <p className="strategy-detail__inline-error">{strategyActivationError}</p>
            )}
          </div>
        ) : isAutoTradingEnabled ? (
          <AutoTradingActiveSection
            autoTrading={autoTrading}
            tradingLimit={tradingLimit}
            isSubmitting={isAutoTradingSubmitting}
            error={autoTradingError}
            onStop={() => void handleAutoTradingStop()}
            onOrders={() => navigate('/orders')}
          />
        ) : (
          <AutoTradingSetupSection
            form={autoTradingForm}
            setForm={setAutoTradingForm}
            isSubmitting={isAutoTradingSubmitting}
            error={autoTradingError}
            hasExistingAutoTrading={autoTrading !== null}
            onSubmit={() => void handleAutoTradingStart()}
          />
        )}
      </section>

      {isStrategyActive && (
        <section className="strategy-detail__deactivation">
          <div className="strategy-detail__deactivation-info">
            <strong>전략 비활성화</strong>

            <p>
              전략을 비활성화하면 더 이상 자동매매에 사용할 수 없습니다. 다시 사용하려면 전략을
              활성화해야 합니다.
            </p>

            {isAutoTradingEnabled && (
              <p className="strategy-detail__deactivation-warning">
                자동매매가 실행 중입니다. 먼저 자동매매를 중지해주세요.
              </p>
            )}

            {strategyActivationError && (
              <p className="strategy-detail__inline-error">{strategyActivationError}</p>
            )}
          </div>

          <button
            type="button"
            className="strategy-detail__deactivate-button"
            disabled={isStrategyActivating || isAutoTradingEnabled}
            onClick={() => void handleStrategyDeactivation()}
          >
            {isStrategyActivating ? (
              <>
                <LoaderCircle className="strategy-detail__spinner" size={16} />
                비활성화 중
              </>
            ) : (
              '전략 비활성화'
            )}
          </button>
        </section>
      )}
    </main>
  );
}

interface BacktestFormSectionProps {
  form: BacktestForm;
  setForm: React.Dispatch<React.SetStateAction<BacktestForm>>;
  isSubmitting: boolean;
  error: string;
  canCancel: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

function BacktestFormSection({
  form,
  setForm,
  isSubmitting,
  error,
  canCancel,
  onCancel,
  onSubmit,
}: BacktestFormSectionProps) {
  return (
    <div className="strategy-detail__backtest-form">
      <div className="strategy-detail__form-grid">
        <label>
          <span>시작일</span>

          <input
            type="date"
            value={form.startDate}
            disabled={isSubmitting}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                startDate: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>종료일</span>

          <input
            type="date"
            value={form.endDate}
            disabled={isSubmitting}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                endDate: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>초기 투자금</span>

          <div className="strategy-detail__money-input">
            <input
              type="number"
              min="1"
              value={form.initialCash}
              disabled={isSubmitting}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  initialCash: event.target.value,
                }))
              }
            />
            <span>원</span>
          </div>
        </label>
      </div>

      {error && <p className="strategy-detail__inline-error">{error}</p>}

      <div className="strategy-detail__form-actions">
        {canCancel && (
          <button
            type="button"
            className="strategy-detail__secondary-button"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            취소
          </button>
        )}

        <button
          type="button"
          className="strategy-detail__primary-button"
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="strategy-detail__spinner" size={17} />
              실행 중
            </>
          ) : (
            '백테스트 실행'
          )}
        </button>
      </div>
    </div>
  );
}

function BacktestResultSection({ backtest, error }: { backtest: BacktestDetail; error: string }) {
  if (backtest.status === 'REQUESTED' || backtest.status === 'RUNNING') {
    return (
      <div className="strategy-detail__processing">
        <LoaderCircle className="strategy-detail__spinner" size={22} />

        <div>
          <strong>백테스트를 실행하고 있습니다.</strong>
          <p>과거 데이터를 기준으로 전략 성과를 계산하고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (backtest.status === 'FAILED') {
    return (
      <div className="strategy-detail__backtest-failed">
        <AlertCircle size={22} />

        <div>
          <strong>백테스트를 완료하지 못했습니다.</strong>
          <p>{error || '테스트 조건 또는 시장 데이터를 확인한 뒤 다시 실행해주세요.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="strategy-detail__backtest-result">
      <div className="strategy-detail__result-meta">
        <div>
          <span>테스트 기간</span>
          <strong>
            {formatDate(backtest.startDate)} ~ {formatDate(backtest.endDate)}
          </strong>
        </div>

        <span className="strategy-detail__backtest-status strategy-detail__backtest-status--completed">
          완료
        </span>
      </div>

      <div className="strategy-detail__metric-grid">
        <ResultValue
          label="총 수익률"
          value={formatSignedPercent(backtest.totalReturnRate)}
          valueClassName={getReturnClassName(backtest.totalReturnRate)}
        />

        <ResultValue label="최대 낙폭" value={formatPercent(backtest.mdd)} />

        <ResultValue label="승률" value={formatPercent(backtest.winRate)} />

        <ResultValue
          label="거래 횟수"
          value={backtest.tradeCount === null ? '-' : `${backtest.tradeCount}회`}
        />

        <ResultValue
          label="최대 연속 손실"
          value={
            backtest.maxConsecutiveLosses === null ? '-' : `${backtest.maxConsecutiveLosses}회`
          }
        />
      </div>
    </div>
  );
}

function AiAnalysisResult({
  analysis,
  onDetail,
}: {
  analysis: AiRiskAnalysisDetail;
  onDetail: () => void;
}) {
  return (
    <div className="strategy-detail__ai-result">
      <div className="strategy-detail__ai-summary">
        <div>
          <span>위험 등급</span>

          <strong
            className={`strategy-detail__risk strategy-detail__risk--${analysis.riskLevel?.toLowerCase()}`}
          >
            {analysis.riskLevel ? getRiskLevelLabel(analysis.riskLevel) : '-'}
          </strong>
        </div>

        {analysis.summary && <p>{analysis.summary}</p>}
      </div>

      {analysis.riskFactors && analysis.riskFactors.length > 0 && (
        <div className="strategy-detail__risk-factors">
          <h3>주요 위험 요인</h3>

          {analysis.riskFactors.slice(0, 3).map((factor, index) => (
            <div key={`${factor.type}-${index}`} className="strategy-detail__risk-factor">
              <strong>{getRiskFactorLabel(factor.type)}</strong>
              <p>{factor.description}</p>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="strategy-detail__result-link" onClick={onDetail}>
        상세 분석 보기
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

function AutoTradingSetupSection({
  form,
  setForm,
  isSubmitting,
  error,
  hasExistingAutoTrading,
  onSubmit,
}: {
  form: AutoTradingForm;
  setForm: React.Dispatch<React.SetStateAction<AutoTradingForm>>;
  isSubmitting: boolean;
  error: string;
  hasExistingAutoTrading: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="strategy-detail__auto-setup">
      <div className="strategy-detail__auto-block">
        <span className="strategy-detail__auto-label">매매 방향</span>

        <div className="strategy-detail__direction-options">
          <DirectionOption
            label="매수·매도"
            value="BOTH"
            selected={form.direction === 'BOTH'}
            disabled={isSubmitting}
            onChange={(direction) =>
              setForm((previous) => ({
                ...previous,
                direction,
              }))
            }
          />

          <DirectionOption
            label="매수만"
            value="BUY_ONLY"
            selected={form.direction === 'BUY_ONLY'}
            disabled={isSubmitting}
            onChange={(direction) =>
              setForm((previous) => ({
                ...previous,
                direction,
              }))
            }
          />

          <DirectionOption
            label="매도만"
            value="SELL_ONLY"
            selected={form.direction === 'SELL_ONLY'}
            disabled={isSubmitting}
            onChange={(direction) =>
              setForm((previous) => ({
                ...previous,
                direction,
              }))
            }
          />
        </div>
      </div>

      <div className="strategy-detail__auto-block">
        <div className="strategy-detail__auto-block-header">
          <span className="strategy-detail__auto-label">거래 한도</span>
          <p>자동 주문이 하루 동안 사용할 수 있는 범위를 설정합니다.</p>
        </div>

        <div className="strategy-detail__limit-grid">
          <label>
            <span>일 최대 주문 금액</span>

            <div className="strategy-detail__unit-input">
              <input
                type="number"
                min="1"
                value={form.dailyMaxOrderAmount}
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    dailyMaxOrderAmount: event.target.value,
                  }))
                }
              />
              <span>원</span>
            </div>
          </label>

          <label>
            <span>일 최대 주문 횟수</span>

            <div className="strategy-detail__unit-input">
              <input
                type="number"
                min="1"
                step="1"
                value={form.dailyMaxOrderCount}
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    dailyMaxOrderCount: event.target.value,
                  }))
                }
              />
              <span>회</span>
            </div>
          </label>

          <label>
            <span>일 손실 한도</span>

            <div className="strategy-detail__unit-input">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.dailyLossLimitRate}
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    dailyLossLimitRate: event.target.value,
                  }))
                }
              />
              <span>%</span>
            </div>
          </label>
        </div>
      </div>

      {error && <p className="strategy-detail__inline-error">{error}</p>}

      <div className="strategy-detail__auto-submit">
        <div>
          <strong>
            {hasExistingAutoTrading
              ? '중지된 자동매매를 다시 시작합니다.'
              : '자동매매를 시작할 준비가 되었습니다.'}
          </strong>
          <p>설정한 전략 조건과 거래 한도에 따라 주문이 실행될 수 있습니다.</p>
        </div>

        <button type="button" disabled={isSubmitting} onClick={onSubmit}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="strategy-detail__spinner" size={17} />
              설정 중...
            </>
          ) : (
            '자동매매 시작'
          )}
        </button>
      </div>
    </div>
  );
}

function DirectionOption({
  label,
  value,
  selected,
  disabled,
  onChange,
}: {
  label: string;
  value: AutoTradingDirection;
  selected: boolean;
  disabled: boolean;
  onChange: (value: AutoTradingDirection) => void;
}) {
  return (
    <label
      className={
        selected
          ? 'strategy-detail__direction strategy-detail__direction--selected'
          : 'strategy-detail__direction'
      }
    >
      <input
        type="radio"
        name="autoTradingDirection"
        checked={selected}
        disabled={disabled}
        onChange={() => onChange(value)}
      />

      <span className="strategy-detail__radio">
        <span />
      </span>

      <strong>{label}</strong>
    </label>
  );
}

function AutoTradingActiveSection({
  autoTrading,
  tradingLimit,
  isSubmitting,
  error,
  onStop,
  onOrders,
}: {
  autoTrading: AutoTrading;
  tradingLimit: TradingLimit | null;
  isSubmitting: boolean;
  error: string;
  onStop: () => void;
  onOrders: () => void;
}) {
  return (
    <div className="strategy-detail__auto-active">
      <div className="strategy-detail__auto-values">
        <AutoTradingValue label="매매 방향" value={getDirectionLabel(autoTrading.direction)} />

        <AutoTradingValue
          label="일 최대 주문 금액"
          value={tradingLimit ? formatWon(tradingLimit.dailyMaxOrderAmount) : '-'}
        />

        <AutoTradingValue
          label="일 최대 주문 횟수"
          value={
            tradingLimit ? `${tradingLimit.dailyMaxOrderCount.toLocaleString('ko-KR')}회` : '-'
          }
        />

        <AutoTradingValue
          label="일 손실 한도"
          value={tradingLimit ? `${tradingLimit.dailyLossLimitRate.toLocaleString('ko-KR')}%` : '-'}
        />
      </div>

      <div className="strategy-detail__latest-order">
        <span>최근 주문</span>

        {autoTrading.latestOrderId ? (
          <div>
            <strong>
              {autoTrading.latestOrderStatus
                ? getOrderStatusLabel(autoTrading.latestOrderStatus)
                : '주문 발생'}
            </strong>

            {autoTrading.latestOrderCreatedAt && (
              <small>{formatDateTime(autoTrading.latestOrderCreatedAt)}</small>
            )}
          </div>
        ) : (
          <strong>아직 발생한 주문이 없습니다.</strong>
        )}

        {autoTrading.latestFailureMessage && <p>{autoTrading.latestFailureMessage}</p>}
      </div>

      {error && <p className="strategy-detail__inline-error">{error}</p>}

      <div className="strategy-detail__auto-actions">
        <button type="button" className="strategy-detail__secondary-button" onClick={onOrders}>
          주문·체결 보기
        </button>

        <button
          type="button"
          className="strategy-detail__stop-button"
          disabled={isSubmitting}
          onClick={onStop}
        >
          {isSubmitting ? '중지 중...' : '자동매매 중지'}
        </button>
      </div>
    </div>
  );
}

function AutoTradingValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="strategy-detail__auto-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VerificationStep({ label, state }: { label: string; state: VerificationState }) {
  return (
    <div className={`strategy-detail__step strategy-detail__step--${state}`}>
      <span className="strategy-detail__step-marker">
        {state === 'complete' ? <Check size={14} strokeWidth={2.5} /> : <span />}
      </span>

      <strong>{label}</strong>
    </div>
  );
}

function VerificationLine() {
  return <span className="strategy-detail__step-line" aria-hidden="true" />;
}

function ValueItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="strategy-detail__value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultValue({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="strategy-detail__result-value">
      <span>{label}</span>
      <strong className={valueClassName}>{value}</strong>
    </div>
  );
}

function getStrategyStatusLabel(status: StrategyStatus): string {
  switch (status) {
    case 'ACTIVE':
      return '활성';
    case 'INACTIVE':
      return '비활성';
    case 'DELETED':
      return '삭제됨';
  }
}

function getDirectionLabel(direction: AutoTradingDirection): string {
  switch (direction) {
    case 'BOTH':
      return '매수·매도';
    case 'BUY_ONLY':
      return '매수만';
    case 'SELL_ONLY':
      return '매도만';
  }
}

function getOrderStatusLabel(status: string): string {
  switch (status) {
    case 'REQUESTED':
      return '주문 요청';
    case 'PROCESSING':
      return '처리 중';
    case 'ACCEPTED':
      return '주문 접수';
    case 'PARTIALLY_FILLED':
      return '일부 체결';
    case 'FILLED':
      return '체결 완료';
    case 'CANCELED':
      return '취소';
    case 'FAILED':
      return '주문 실패';
    case 'TIMEOUT':
      return '확인 필요';
    case 'PARTIALLY_FILLED_REJECTED':
      return '일부 체결 후 실패';
    default:
      return status;
  }
}

function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'LOW':
      return '낮음';
    case 'MEDIUM':
      return '보통';
    case 'HIGH':
      return '높음';
  }
}

function getRiskFactorLabel(type: RiskFactorType): string {
  switch (type) {
    case 'MAX_DRAWDOWN':
      return '최대 낙폭';
    case 'CONSECUTIVE_LOSS':
      return '연속 손실';
    case 'LOW_WIN_RATE':
      return '낮은 승률';
    case 'LOW_TRADE_COUNT':
      return '거래 표본';
    case 'STOP_LOSS_RISK':
      return '손절 조건';
    case 'FINANCIAL_INDICATOR_RISK':
      return '재무지표';
  }
}

function getReturnClassName(value: number | null): string {
  if (value === null || value === 0) {
    return '';
  }

  return value > 0 ? 'strategy-detail__result-value--rise' : 'strategy-detail__result-value--fall';
}

function formatWon(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatMultiple(value: number | null): string {
  return value === null ? '설정 안 함' : `${value.toLocaleString('ko-KR')}배`;
}

function formatPercent(value: number | null): string {
  return value === null ? '-' : `${value.toLocaleString('ko-KR')}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `${value > 0 ? '+' : ''}${value.toLocaleString('ko-KR')}%`;
}

function formatDate(value: string): string {
  return value.replaceAll('-', '.');
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;

  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }

  return fallback;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export default StrategyDetailPage;
