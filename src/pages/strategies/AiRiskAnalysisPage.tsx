import axios from 'axios';
import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { createAiRiskAnalysis, getAiRiskAnalysis } from '../../api/aiRisk';
import { getBacktestDetail } from '../../api/backtest';
import { getStrategy } from '../../api/strategy';

import type { AiRiskAnalysisDetail, RiskFactorType, RiskLevel } from '../../types/aiRisk';
import type { BacktestDetail } from '../../types/backtest';
import type { StrategyDetail } from '../../types/strategy';

import './AiRiskAnalysisPage.scss';

const POLLING_INTERVAL = 1500;

function AiRiskAnalysisPage() {
  const { strategyId, backtestId } = useParams<{
    strategyId: string;
    backtestId: string;
  }>();

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);

  const [backtest, setBacktest] = useState<BacktestDetail | null>(null);

  const [analysis, setAnalysis] = useState<AiRiskAnalysisDetail | null>(null);

  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!strategyId || !backtestId) {
      return;
    }

    let cancelled = false;

    const loadPageData = async () => {
      try {
        const [strategyResponse, backtestResponse] = await Promise.all([
          getStrategy(strategyId),
          getBacktestDetail(strategyId, backtestId),
        ]);

        if (cancelled) {
          return;
        }

        setStrategy(strategyResponse);
        setBacktest(backtestResponse);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(getErrorMessage(error, '분석에 필요한 정보를 불러오지 못했습니다.'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, [strategyId, backtestId]);

  useEffect(() => {
    if (!analysisId) {
      return;
    }

    if (analysis?.status === 'COMPLETED' || analysis?.status === 'FAILED') {
      return;
    }

    let cancelled = false;

    const pollAnalysis = async () => {
      if (isPollingRef.current) {
        return;
      }

      try {
        isPollingRef.current = true;

        const response = await getAiRiskAnalysis(analysisId);

        if (cancelled) {
          return;
        }

        setAnalysis(response);

        if (response.status === 'FAILED') {
          setErrorMessage(response.message);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(getErrorMessage(error, 'AI 위험 분석 상태를 확인하지 못했습니다.'));
      } finally {
        isPollingRef.current = false;
      }
    };

    void pollAnalysis();

    const intervalId = window.setInterval(() => {
      void pollAnalysis();
    }, POLLING_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      isPollingRef.current = false;
    };
  }, [analysisId, analysis?.status]);

  const handleStartAnalysis = async () => {
    if (!strategyId || !backtestId || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      setAnalysis(null);

      const response = await createAiRiskAnalysis({
        strategyId,
        backtestId,
      });

      setAnalysisId(response.analysisId);

      /*
       * POST 응답이 PENDING인 현재 구조뿐 아니라,
       * 향후 즉시 완료되는 경우도 안전하게 처리한다.
       */
      if (response.status !== 'PENDING') {
        const detail = await getAiRiskAnalysis(response.analysisId);

        setAnalysis(detail);

        if (detail.status === 'FAILED') {
          setErrorMessage(detail.message);
        }
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'AI 위험 분석을 요청하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="ai-risk-page">
        <div className="ai-risk-page__state">분석 정보를 불러오는 중입니다.</div>
      </section>
    );
  }

  if (!strategyId || !backtestId || !strategy || !backtest) {
    return (
      <section className="ai-risk-page">
        <div className="ai-risk-page__state">
          {errorMessage || '분석에 필요한 정보를 찾을 수 없습니다.'}
        </div>
      </section>
    );
  }

  const isPending = analysisId !== null && (!analysis || analysis.status === 'PENDING');

  const isCompleted = analysis?.status === 'COMPLETED';

  const isFailed = analysis?.status === 'FAILED';

  return (
    <section className="ai-risk-page">
      <header className="ai-risk-page__header">
        <div>
          <h1>전략 위험 분석</h1>

          <p>
            {strategy.strategyName}
            <span> · </span>
            {strategy.stockCode}
          </p>
        </div>
      </header>

      {!analysisId && !isCompleted && (
        <AnalysisReady
          backtest={backtest}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onStart={() => void handleStartAnalysis()}
        />
      )}

      {isPending && <AnalysisPending />}

      {isCompleted && analysis && <AnalysisResult analysis={analysis} />}

      {isFailed && analysis && (
        <AnalysisFailed
          message={analysis.message}
          onRetry={() => void handleStartAnalysis()}
          isSubmitting={isSubmitting}
        />
      )}
    </section>
  );
}

interface AnalysisReadyProps {
  backtest: BacktestDetail;
  isSubmitting: boolean;
  errorMessage: string;
  onStart: () => void;
}

function AnalysisReady({ backtest, isSubmitting, errorMessage, onStart }: AnalysisReadyProps) {
  return (
    <div className="ai-risk-page__ready">
      <section className="ai-risk-page__section">
        <div className="ai-risk-page__section-header">
          <h2>분석 대상</h2>

          <p>완료된 백테스트 결과를 기반으로 전략의 주요 위험 요인을 분석합니다.</p>
        </div>

        <div className="ai-risk-page__metrics">
          <Metric label="총 수익률" value={formatSignedPercent(backtest.totalReturnRate)} />

          <Metric label="최대 낙폭" value={formatPercent(backtest.mdd)} />

          <Metric label="승률" value={formatPercent(backtest.winRate)} />

          <Metric label="거래 횟수" value={formatCount(backtest.tradeCount)} />
        </div>
      </section>

      <section className="ai-risk-page__guide">
        <div>
          <strong>전략의 위험 수준을 확인합니다.</strong>

          <p>
            백테스트 성과와 전략 조건을 함께 검토하여 위험 등급, 주요 위험 요인, 분석 근거와
            참고사항을 제공합니다.
          </p>
        </div>

        <button type="button" disabled={isSubmitting} onClick={onStart}>
          {isSubmitting ? '분석 요청 중...' : '위험 분석 시작'}
        </button>
      </section>

      {errorMessage && <p className="ai-risk-page__error">{errorMessage}</p>}

      <p className="ai-risk-page__notice">
        분석 결과는 투자 판단을 돕기 위한 참고 정보이며 수익을 보장하지 않습니다.
      </p>
    </div>
  );
}

function AnalysisPending() {
  return (
    <div className="ai-risk-page__pending">
      <LoaderCircle size={24} />

      <strong>전략의 위험 요인을 분석하고 있습니다.</strong>

      <p>
        백테스트 결과와 전략 조건을 검토하고 있습니다. 분석이 완료되면 결과가 자동으로 표시됩니다.
      </p>
    </div>
  );
}

interface AnalysisResultProps {
  analysis: AiRiskAnalysisDetail;
}

function AnalysisResult({ analysis }: AnalysisResultProps) {
  return (
    <div className="ai-risk-page__result">
      <section className="ai-risk-page__result-summary">
        <div className="ai-risk-page__result-status">
          <CheckCircle2 size={16} />
          분석 완료
        </div>

        <div className="ai-risk-page__risk-heading">
          <div>
            <span>위험 등급</span>

            <RiskLevelLabel level={analysis.riskLevel} />
          </div>

          {analysis.summary && <p>{analysis.summary}</p>}
        </div>
      </section>

      {analysis.riskFactors && analysis.riskFactors.length > 0 && (
        <section className="ai-risk-page__section">
          <div className="ai-risk-page__section-header">
            <h2>주요 위험 요인</h2>
          </div>

          <div className="ai-risk-page__factors">
            {analysis.riskFactors.map((factor, index) => (
              <div className="ai-risk-page__factor" key={`${factor.type}-${index}`}>
                <span>{getRiskFactorLabel(factor.type)}</span>

                <p>{factor.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {analysis.reasoning && (
        <section className="ai-risk-page__section">
          <div className="ai-risk-page__section-header">
            <h2>분석 근거</h2>
          </div>

          <p className="ai-risk-page__reasoning">{analysis.reasoning}</p>
        </section>
      )}

      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <section className="ai-risk-page__section">
          <div className="ai-risk-page__section-header">
            <h2>검토 사항</h2>
          </div>

          <ul className="ai-risk-page__recommendations">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="ai-risk-page__notice">
        분석 결과는 투자 판단을 돕기 위한 참고 정보이며 수익을 보장하지 않습니다.
      </p>
    </div>
  );
}

interface AnalysisFailedProps {
  message: string;
  isSubmitting: boolean;
  onRetry: () => void;
}

function AnalysisFailed({ message, isSubmitting, onRetry }: AnalysisFailedProps) {
  return (
    <div className="ai-risk-page__failed">
      <AlertTriangle size={24} />

      <strong>위험 분석을 완료하지 못했습니다.</strong>

      <p>{message}</p>

      <button type="button" disabled={isSubmitting} onClick={onRetry}>
        <RefreshCw size={15} />

        {isSubmitting ? '다시 요청 중...' : '다시 분석'}
      </button>
    </div>
  );
}

interface RiskLevelLabelProps {
  level: RiskLevel | null;
}

function RiskLevelLabel({ level }: RiskLevelLabelProps) {
  if (!level) {
    return <strong>-</strong>;
  }

  return (
    <strong className={`ai-risk-page__risk-level ai-risk-page__risk-level--${level.toLowerCase()}`}>
      {getRiskLevelLabel(level)}
    </strong>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="ai-risk-page__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return '-';
  }

  const prefix = value > 0 ? '+' : '';

  return `${prefix}${value.toLocaleString('ko-KR')}%`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `${value.toLocaleString('ko-KR')}%`;
}

function formatCount(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `${value.toLocaleString('ko-KR')}회`;
}

export default AiRiskAnalysisPage;
