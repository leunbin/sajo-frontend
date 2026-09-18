import axios from 'axios';
import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getStrategy, updateStrategyActivation } from '../../api/strategy';
import type { StrategyDetail, StrategyStatus } from '../../types/strategy';
import './StrategyDetailPage.scss';

function StrategyDetailPage() {
  const navigate = useNavigate();

  const { strategyId } = useParams<{
    strategyId: string;
  }>();

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');

  const [isChangingActivation, setIsChangingActivation] = useState(false);

  const [activationError, setActivationError] = useState('');

  useEffect(() => {
    if (!strategyId) {
      return;
    }

    let ignore = false;

    const fetchStrategy = async () => {
      try {
        const response = await getStrategy(strategyId);

        if (ignore) {
          return;
        }

        setStrategy(response);
        setErrorMessage('');
      } catch (error) {
        if (ignore) {
          return;
        }

        if (axios.isAxiosError(error)) {
          setErrorMessage(error.response?.data?.message ?? '전략 정보를 불러오지 못했습니다.');
        } else {
          setErrorMessage('전략 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void fetchStrategy();

    return () => {
      ignore = true;
    };
  }, [strategyId]);

  const handleActivationChange = async () => {
    if (!strategy || isChangingActivation) {
      return;
    }

    const nextActive = strategy.status !== 'ACTIVE';

    try {
      setIsChangingActivation(true);
      setActivationError('');

      const response = await updateStrategyActivation(strategy.strategyId, nextActive);

      setStrategy((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          status: response.status,
        };
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setActivationError(error.response?.data?.message ?? '전략 상태를 변경하지 못했습니다.');
      } else {
        setActivationError('전략 상태를 변경하지 못했습니다.');
      }
    } finally {
      setIsChangingActivation(false);
    }
  };

  if (isLoading) {
    return (
      <section className="strategy-detail">
        <div className="strategy-detail__state">전략 정보를 불러오는 중입니다.</div>
      </section>
    );
  }

  if (errorMessage || !strategy) {
    return (
      <section className="strategy-detail">
        <button
          type="button"
          className="strategy-detail__back"
          onClick={() => navigate('/strategies')}
        >
          <ArrowLeft size={18} />내 전략
        </button>

        <div className="strategy-detail__state">{errorMessage || '전략을 찾을 수 없습니다.'}</div>
      </section>
    );
  }

  return (
    <section className="strategy-detail">
      <button
        type="button"
        className="strategy-detail__back"
        onClick={() => navigate('/strategies')}
      >
        <ArrowLeft size={18} />내 전략
      </button>

      <header className="strategy-detail__header">
        <div>
          <h1>{strategy.strategyName}</h1>
          <p>{strategy.stockCode}</p>
        </div>

        <span
          className={`strategy-detail__status strategy-detail__status--${strategy.status.toLowerCase()}`}
        >
          {getStatusLabel(strategy.status)}
        </span>
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

            <p>전략을 검증한 뒤 위험을 확인하고 자동매매를 설정할 수 있습니다.</p>
          </div>
        </div>

        <div className="strategy-detail__steps">
          <VerificationStep label="전략 설정" state="complete" />

          <VerificationLine />

          <VerificationStep label="백테스트" state="current" />

          <VerificationLine />

          <VerificationStep label="위험 분석" state="pending" />

          <VerificationLine />

          <VerificationStep label="자동매매" state="pending" />
        </div>

        <div className="strategy-detail__next">
          <div>
            <strong>과거 데이터로 전략을 검증해보세요.</strong>

            <p>백테스트 결과를 바탕으로 수익률과 손실 위험을 확인할 수 있습니다.</p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/strategies/${strategy.strategyId}/backtest`)}
          >
            백테스트 실행
          </button>
        </div>
      </section>

      <section className="strategy-detail__section strategy-detail__operation">
        <div className="strategy-detail__section-header">
          <h2>전략 운용</h2>
        </div>

        <div className="strategy-detail__operation-content">
          <div>
            <strong>
              {strategy.status === 'ACTIVE'
                ? '현재 운용 중인 전략입니다.'
                : '현재 비활성 상태입니다.'}
            </strong>

            <p>
              {strategy.status === 'ACTIVE'
                ? '설정한 조건에 따라 자동매매에 사용됩니다.'
                : '활성화하면 설정한 조건에 따라 자동매매에 사용됩니다.'}
            </p>

            {activationError && (
              <p className="strategy-detail__operation-error">{activationError}</p>
            )}
          </div>

          {strategy.status !== 'DELETED' && (
            <button
              type="button"
              className={
                strategy.status === 'ACTIVE'
                  ? 'strategy-detail__activation strategy-detail__activation--deactivate'
                  : 'strategy-detail__activation'
              }
              disabled={isChangingActivation}
              onClick={() => void handleActivationChange()}
            >
              {isChangingActivation
                ? '변경 중...'
                : strategy.status === 'ACTIVE'
                  ? '전략 비활성화'
                  : '전략 활성화'}
            </button>
          )}
        </div>
      </section>
    </section>
  );
}

interface ValueItemProps {
  label: string;
  value: string;
}

function ValueItem({ label, value }: ValueItemProps) {
  return (
    <div className="strategy-detail__value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type VerificationState = 'complete' | 'current' | 'pending';

interface VerificationStepProps {
  label: string;
  state: VerificationState;
}

function VerificationStep({ label, state }: VerificationStepProps) {
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

function getStatusLabel(status: StrategyStatus): string {
  switch (status) {
    case 'ACTIVE':
      return '운용 중';

    case 'INACTIVE':
      return '비활성';

    case 'DELETED':
      return '삭제됨';
  }
}

function formatWon(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatMultiple(value: number | null): string {
  if (value === null) {
    return '설정 안 함';
  }

  return `${value.toLocaleString('ko-KR')}배`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return '설정 안 함';
  }

  return `${value.toLocaleString('ko-KR')}%`;
}

export default StrategyDetailPage;
