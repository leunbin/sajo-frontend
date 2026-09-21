import axios from 'axios';
import { ChevronRight, Plus, RotateCcw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getStrategies } from '../../api/strategy';
import Button from '../../components/common/Button/Button';
import SlidingTabs from '../../components/common/SlidingTabs/SlidingTabs';
import type { StrategyStatus, StrategySummary } from '../../types/strategy';

import './StrategiesPage.scss';

type StrategyFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const PAGE_SIZE = 10;

const FILTERS: Array<{
  value: StrategyFilter;
  label: string;
}> = [
  {
    value: 'ALL',
    label: '전체',
  },
  {
    value: 'ACTIVE',
    label: '운용 중',
  },
  {
    value: 'INACTIVE',
    label: '비활성',
  },
];

function StrategiesPage() {
  const navigate = useNavigate();

  const [strategies, setStrategies] = useState<StrategySummary[]>([]);
  const [filter, setFilter] = useState<StrategyFilter>('ALL');
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    const loadStrategies = async () => {
      try {
        const status: StrategyStatus | undefined = filter === 'ALL' ? undefined : filter;

        const response = await getStrategies(0, PAGE_SIZE, status);

        if (ignore) {
          return;
        }

        setStrategies(response.strategies);
        setPage(response.page);
        setTotalElements(response.totalElements);
        setErrorMessage('');
      } catch (error) {
        if (ignore) {
          return;
        }

        setStrategies([]);
        setTotalElements(0);

        if (axios.isAxiosError(error)) {
          setErrorMessage(error.response?.data?.message ?? '전략 목록을 불러오지 못했습니다.');
        } else {
          setErrorMessage('전략 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadStrategies();

    return () => {
      ignore = true;
    };
  }, [filter, retryCount]);

  const handleFilterChange = (nextFilter: StrategyFilter) => {
    if (nextFilter === filter) {
      return;
    }

    setFilter(nextFilter);
  };

  const hasMore = strategies.length < totalElements;

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);

      const status: StrategyStatus | undefined = filter === 'ALL' ? undefined : filter;
      const response = await getStrategies(page + 1, PAGE_SIZE, status);

      setStrategies((previous) => [...previous, ...response.strategies]);
      setPage(response.page);
      setTotalElements(response.totalElements);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message ?? '전략을 추가로 불러오지 못했습니다.');
      } else {
        setErrorMessage('전략을 추가로 불러오지 못했습니다.');
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage('');
    setRetryCount((previous) => previous + 1);
  };

  return (
    <section className="strategies-page">
      <header className="strategies-page__header">
        <div>
          <h1>내 전략</h1>
          <p>투자 전략을 확인하고 운용 상태를 관리할 수 있습니다.</p>
        </div>

        <Button
          type="button"
          className="strategies-page__create"
          variant="primary"
          size="md"
          leadingIcon={<Plus size={17} />}
          onClick={() => navigate('/stocks')}
        >
          <span className="strategies-page__create-label">새 전략 만들기</span>
        </Button>
      </header>

      <div className="strategies-page__toolbar">
        <div className="strategies-page__filters">
          <SlidingTabs<StrategyFilter>
            items={FILTERS}
            value={filter}
            onChange={handleFilterChange}
            variant="underline"
            size="sm"
            ariaLabel="전략 상태"
          />
        </div>

        {!isLoading && !errorMessage && (
          <span className="strategies-page__count">{totalElements.toLocaleString('ko-KR')}개</span>
        )}
      </div>

      {isLoading ? (
        <div className="strategies-page__state">전략을 불러오는 중입니다.</div>
      ) : errorMessage ? (
        <div className="strategies-page__state strategies-page__state--error">
          <strong>전략을 불러오지 못했습니다.</strong>
          <p>{errorMessage}</p>

          <Button
            type="button"
            variant="secondary"
            size="md"
            leadingIcon={<RotateCcw size={16} />}
            onClick={handleRetry}
          >
            다시 시도
          </Button>
        </div>
      ) : strategies.length === 0 ? (
        <EmptyStrategies filter={filter} onCreate={() => navigate('/stocks')} />
      ) : (
        <>
          <div className="strategies-page__list">
            {strategies.map((strategy) => (
              <StrategyRow
                key={strategy.strategyId}
                strategy={strategy}
                onClick={() => navigate(`/strategies/${strategy.strategyId}`)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="strategies-page__more">
              <Button
                type="button"
                variant="secondary"
                size="md"
                loading={isLoadingMore}
                onClick={() => void handleLoadMore()}
              >
                {isLoadingMore ? '불러오는 중...' : '전략 더 보기'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface StrategyRowProps {
  strategy: StrategySummary;
  onClick: () => void;
}

function StrategyRow({ strategy, onClick }: StrategyRowProps) {
  return (
    <button type="button" className="strategies-page__row" onClick={onClick}>
      <div className="strategies-page__row-main">
        <div className="strategies-page__row-heading">
          <strong>{strategy.strategyName}</strong>
          <StrategyStatusBadge status={strategy.status} />
        </div>

        <span className="strategies-page__stock-code">{strategy.stockCode}</span>
      </div>

      <div className="strategies-page__amount">
        <span>배정 금액</span>
        <strong>{formatWon(strategy.allocatedAmount)}</strong>
      </div>

      <ChevronRight className="strategies-page__arrow" size={19} />
    </button>
  );
}

interface StrategyStatusBadgeProps {
  status: StrategyStatus;
}

function StrategyStatusBadge({ status }: StrategyStatusBadgeProps) {
  return (
    <span className={`strategies-page__status strategies-page__status--${status.toLowerCase()}`}>
      {getStatusLabel(status)}
    </span>
  );
}

interface EmptyStrategiesProps {
  filter: StrategyFilter;
  onCreate: () => void;
}

function EmptyStrategies({ filter, onCreate }: EmptyStrategiesProps) {
  if (filter !== 'ALL') {
    return (
      <div className="strategies-page__state">
        <strong>해당 상태의 전략이 없습니다.</strong>
        <p>다른 상태를 선택해 전략을 확인해보세요.</p>
      </div>
    );
  }

  return (
    <div className="strategies-page__state">
      <strong>아직 만든 전략이 없습니다.</strong>
      <p>종목을 선택하고 첫 투자 전략을 만들어보세요.</p>

      <Button
        type="button"
        variant="primary"
        size="md"
        leadingIcon={<Search size={16} />}
        onClick={onCreate}
      >
        종목 탐색하기
      </Button>
    </div>
  );
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

export default StrategiesPage;
