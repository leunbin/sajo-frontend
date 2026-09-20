import axios from 'axios';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { createBacktest, getBacktestDetail, getBacktestStatus } from '../../api/backtest';
import { getStrategy } from '../../api/strategy';

import type { BacktestDetail, BacktestStatus } from '../../types/backtest';
import type { StrategyDetail } from '../../types/strategy';

import './BacktestPage.scss';

const POLLING_INTERVAL = 1500;

function BacktestPage() {
  const navigate = useNavigate();
  const { strategyId } = useParams<{
    strategyId: string;
  }>();

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);

  const [backtest, setBacktest] = useState<BacktestDetail | null>(null);

  const [backtestId, setBacktestId] = useState<string | null>(null);

  const [status, setStatus] = useState<BacktestStatus | null>(null);

  const [startDate, setStartDate] = useState('');

  const [endDate, setEndDate] = useState('');

  const [initialCash, setInitialCash] = useState('10000000');

  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!strategyId) {
      return;
    }

    let ignore = false;

    const loadStrategy = async () => {
      try {
        const response = await getStrategy(strategyId);

        if (ignore) {
          return;
        }

        setStrategy(response);
      } catch (error) {
        if (ignore) {
          return;
        }

        setErrorMessage(getErrorMessage(error, '전략 정보를 불러오지 못했습니다.'));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadStrategy();

    return () => {
      ignore = true;
    };
  }, [strategyId]);

  useEffect(() => {
    if (!strategyId || !backtestId || status === 'COMPLETED' || status === 'FAILED') {
      return;
    }

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const response = await getBacktestStatus(strategyId, backtestId);

        if (cancelled) {
          return;
        }

        setStatus(response.status);

        if (response.status === 'COMPLETED') {
          const detail = await getBacktestDetail(strategyId, backtestId);

          if (cancelled) {
            return;
          }

          setBacktest(detail);
          setStatus('COMPLETED');
        }

        if (response.status === 'FAILED') {
          setErrorMessage('백테스트 실행에 실패했습니다.');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(getErrorMessage(error, '백테스트 상태를 확인하지 못했습니다.'));
      }
    };

    void pollStatus();

    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, POLLING_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [strategyId, backtestId, status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!strategyId || isSubmitting) {
      return;
    }

    const cash = Number(initialCash);

    if (!startDate || !endDate) {
      setErrorMessage('백테스트 기간을 입력해주세요.');
      return;
    }

    if (startDate > endDate) {
      setErrorMessage('시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }

    if (!Number.isFinite(cash) || cash <= 0) {
      setErrorMessage('초기 투자금은 0보다 커야 합니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      setBacktest(null);

      const response = await createBacktest(strategyId, {
        startDate,
        endDate,
        initialCash: cash,
      });

      setBacktestId(response.backtestId);
      setStatus(response.status);

      if (response.status === 'COMPLETED') {
        const detail = await getBacktestDetail(strategyId, response.backtestId);

        setBacktest(detail);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '백테스트를 실행하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="backtest-page">
        <div className="backtest-page__state">전략 정보를 불러오는 중입니다.</div>
      </section>
    );
  }

  if (!strategy || !strategyId) {
    return (
      <section className="backtest-page">
        <div className="backtest-page__state">{errorMessage || '전략을 찾을 수 없습니다.'}</div>
      </section>
    );
  }

  return (
    <section className="backtest-page">
      <header className="backtest-page__header">
        <div>
          <h1>백테스트</h1>

          <p>
            {strategy.strategyName}
            <span> · </span>
            {strategy.stockCode}
          </p>
        </div>
      </header>

      {!backtest && (
        <form className="backtest-page__form" onSubmit={(event) => void handleSubmit(event)}>
          <section className="backtest-page__section">
            <div className="backtest-page__section-header">
              <h2>테스트 조건</h2>

              <p>과거 데이터를 조회할 기간과 초기 투자금을 설정해주세요.</p>
            </div>

            <div className="backtest-page__fields">
              <label>
                <span>시작일</span>

                <input
                  type="date"
                  value={startDate}
                  disabled={isBacktestRunning(status)}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>

              <label>
                <span>종료일</span>

                <input
                  type="date"
                  value={endDate}
                  disabled={isBacktestRunning(status)}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>

              <label>
                <span>초기 투자금</span>

                <div className="backtest-page__money-input">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={initialCash}
                    disabled={isBacktestRunning(status)}
                    onChange={(event) => setInitialCash(event.target.value)}
                  />

                  <span>원</span>
                </div>
              </label>
            </div>
          </section>

          <section className="backtest-page__section">
            <div className="backtest-page__section-header">
              <h2>전략 조건</h2>
            </div>

            <div className="backtest-page__strategy-values">
              <ValueItem label="매수 기준가" value={formatWon(strategy.buyConditionPrice)} />

              <ValueItem label="매도 기준가" value={formatWon(strategy.sellConditionPrice)} />

              <ValueItem label="목표 수익률" value={formatPercent(strategy.targetReturnRate)} />

              <ValueItem label="손절률" value={formatPercent(strategy.stopLossRate)} />
            </div>
          </section>

          {errorMessage && <p className="backtest-page__error">{errorMessage}</p>}

          {isBacktestRunning(status) ? (
            <div className="backtest-page__running">
              <LoaderCircle size={20} />

              <div>
                <strong>백테스트를 실행하고 있습니다.</strong>

                <p>과거 데이터를 기준으로 전략의 성과를 계산하고 있습니다.</p>
              </div>
            </div>
          ) : (
            <div className="backtest-page__actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '요청 중...' : '백테스트 실행'}
              </button>
            </div>
          )}
        </form>
      )}

      {backtest && status === 'COMPLETED' && (
        <BacktestResult
          backtest={backtest}
          onAnalyze={() =>
            navigate(`/strategies/${strategyId}/backtests/${backtest.backtestId}/analysis`)
          }
        />
      )}
    </section>
  );
}

interface BacktestResultProps {
  backtest: BacktestDetail;
  onAnalyze: () => void;
}

function BacktestResult({ backtest, onAnalyze }: BacktestResultProps) {
  return (
    <div className="backtest-page__result">
      <div className="backtest-page__result-heading">
        <div>
          <span className="backtest-page__completed">
            <CheckCircle2 size={16} />
            완료
          </span>

          <h2>백테스트 결과</h2>

          <p>
            {backtest.startDate} ~ {backtest.endDate}
          </p>
        </div>
      </div>

      <div className="backtest-page__metrics">
        <MetricItem label="총 수익률" value={formatSignedPercent(backtest.totalReturnRate)} />

        <MetricItem label="최대 낙폭" value={formatPercent(backtest.mdd)} />

        <MetricItem label="승률" value={formatPercent(backtest.winRate)} />

        <MetricItem label="거래 횟수" value={formatCount(backtest.tradeCount, '회')} />

        <MetricItem
          label="최대 연속 손실"
          value={formatCount(backtest.maxConsecutiveLosses, '회')}
        />
      </div>

      <div className="backtest-page__result-info">
        <span>초기 투자금</span>

        <strong>{formatWon(backtest.initialCash)}</strong>
      </div>

      <div className="backtest-page__analysis">
        <div>
          <strong>이 결과의 위험 요인을 확인해보세요.</strong>

          <p>전략과 백테스트 결과를 기반으로 위험 수준과 주요 요인을 분석합니다.</p>
        </div>

        <button type="button" onClick={onAnalyze}>
          AI 위험 분석
        </button>
      </div>
    </div>
  );
}

interface ValueItemProps {
  label: string;
  value: string;
}

function ValueItem({ label, value }: ValueItemProps) {
  return (
    <div className="backtest-page__strategy-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface MetricItemProps {
  label: string;
  value: string;
}

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <div className="backtest-page__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isBacktestRunning(status: BacktestStatus | null): boolean {
  return status === 'REQUESTED' || status === 'RUNNING';
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}

function formatWon(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `${value.toLocaleString('ko-KR')}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return '-';
  }

  const prefix = value > 0 ? '+' : '';

  return `${prefix}${value.toLocaleString('ko-KR')}%`;
}

function formatCount(value: number | null, unit: string): string {
  if (value === null) {
    return '-';
  }

  return `${value.toLocaleString('ko-KR')}${unit}`;
}

export default BacktestPage;
