import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  ChevronRight,
  Landmark,
  LoaderCircle,
  RefreshCw,
  WalletCards,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getAccountDeposit, getMyAccount } from '../../api/account';
import { getAutoTradings } from '../../api/autoTrading';
import { getOrders } from '../../api/order';
import { getStrategies } from '../../api/strategy';

import type { Account, AccountDeposit } from '../../types/account';
import type { AutoTrading } from '../../types/autoTrading';
import type { OrderListItem } from '../../types/order';
import type { StrategySummary } from '../../types/strategy';

import './DashboardPage.scss';

const STRATEGY_PAGE_SIZE = 100;
const AUTO_TRADING_PAGE_SIZE = 100;
const RECENT_ORDER_SIZE = 5;

const formatWon = (value: number) => `${value.toLocaleString('ko-KR')}원`;

const formatProfitLoss = (value: number) => {
  if (value > 0) {
    return `+${formatWon(value)}`;
  }

  return formatWon(value);
};

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallback;
};

const getOrderTypeLabel = (orderType: string) => {
  switch (orderType) {
    case 'BUY':
      return '매수';

    case 'SELL':
      return '매도';

    default:
      return orderType;
  }
};

const getOrderStatusLabel = (status: string) => {
  switch (status) {
    case 'REQUESTED':
      return '주문 요청';

    case 'PROCESSING':
      return '처리 중';

    case 'ACCEPTED':
      return '주문 접수';

    case 'PARTIALLY_FILLED':
      return '부분 체결';

    case 'FILLED':
      return '체결 완료';

    case 'CANCELED':
      return '취소';

    case 'FAILED':
      return '실패';

    case 'TIMEOUT':
      return '시간 초과';

    case 'PARTIALLY_FILLED_REJECTED':
      return '부분 체결 후 거절';

    default:
      return status;
  }
};

const getOrderStatusClass = (status: string) => {
  switch (status) {
    case 'FILLED':
      return 'dashboard-page__order-status--success';

    case 'FAILED':
    case 'TIMEOUT':
    case 'PARTIALLY_FILLED_REJECTED':
      return 'dashboard-page__order-status--failed';

    case 'REQUESTED':
    case 'PROCESSING':
    case 'ACCEPTED':
    case 'PARTIALLY_FILLED':
      return 'dashboard-page__order-status--processing';

    default:
      return '';
  }
};

const DashboardPage = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [deposit, setDeposit] = useState<AccountDeposit | null>(null);

  const [strategies, setStrategies] = useState<StrategySummary[]>([]);

  const [autoTradings, setAutoTradings] = useState<AutoTrading[]>([]);

  const [orders, setOrders] = useState<OrderListItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pageError, setPageError] = useState('');
  const [assetError, setAssetError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const [accountResult, strategyResult, autoTradingResult, orderResult] =
        await Promise.allSettled([
          getMyAccount(),
          getStrategies(0, STRATEGY_PAGE_SIZE),
          getAutoTradings(0, AUTO_TRADING_PAGE_SIZE),
          getOrders({
            page: 0,
            size: RECENT_ORDER_SIZE,
          }),
        ]);

      if (accountResult.status === 'fulfilled') {
        setAccount(accountResult.value);

        if (accountResult.value) {
          try {
            const depositResponse = await getAccountDeposit();

            setDeposit(depositResponse);
            setAssetError('');
          } catch (error) {
            setDeposit(null);
            setAssetError(getErrorMessage(error, '자산 정보를 불러오지 못했습니다.'));
          }
        } else {
          setDeposit(null);
          setAssetError('');
        }
      } else {
        setAccount(null);
        setDeposit(null);

        setAssetError(getErrorMessage(accountResult.reason, '계좌 정보를 불러오지 못했습니다.'));
      }

      if (strategyResult.status === 'fulfilled') {
        setStrategies(
          strategyResult.value.strategies.filter((strategy) => strategy.status !== 'DELETED')
        );
      } else {
        setStrategies([]);
      }

      if (autoTradingResult.status === 'fulfilled') {
        setAutoTradings(autoTradingResult.value.content ?? []);
      } else {
        setAutoTradings([]);
      }

      if (orderResult.status === 'fulfilled') {
        setOrders(orderResult.value.content ?? []);
      } else {
        setOrders([]);
      }

      const coreFailures = [strategyResult, autoTradingResult, orderResult].filter(
        (result) => result.status === 'rejected'
      );

      if (coreFailures.length === 3) {
        setPageError('대시보드 정보를 불러오지 못했습니다.');
      } else {
        setPageError('');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadDashboard]);

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    try {
      setIsRefreshing(true);
      setPageError('');

      await loadDashboard();
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeStrategies = useMemo(
    () => strategies.filter((strategy) => strategy.status === 'ACTIVE'),
    [strategies]
  );

  const enabledAutoTradings = useMemo(
    () => autoTradings.filter((autoTrading) => autoTrading.enabled),
    [autoTradings]
  );

  const autoTradingByStrategyId = useMemo(() => {
    return new Map(autoTradings.map((autoTrading) => [autoTrading.strategyId, autoTrading]));
  }, [autoTradings]);

  const operatingStrategies = useMemo(() => {
    return activeStrategies.slice(0, 4);
  }, [activeStrategies]);

  const dashboardAsOf = deposit?.asOf ?? null;

  if (isLoading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-page__state">
          <LoaderCircle className="dashboard-page__spinner" size={22} />
          <span>투자 현황을 불러오는 중입니다.</span>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-page__state dashboard-page__state--error">
          <AlertCircle size={22} />

          <strong>대시보드를 불러오지 못했습니다.</strong>

          <p>{pageError}</p>

          <button type="button" onClick={() => void handleRefresh()}>
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <h1>대시보드</h1>
          <p>내 자산과 자동매매 운영 현황을 한눈에 확인합니다.</p>
        </div>

        <button
          type="button"
          className="dashboard-page__refresh"
          aria-label="대시보드 새로고침"
          title="새로고침"
          disabled={isRefreshing}
          onClick={() => void handleRefresh()}
        >
          <RefreshCw size={16} className={isRefreshing ? 'dashboard-page__spinner' : undefined} />

          <span>새로고침</span>
        </button>
      </header>

      {/* 자산 */}
      <section className="dashboard-page__section">
        <div className="dashboard-page__section-header">
          <div>
            <h2>내 자산</h2>

            {dashboardAsOf && <p>{formatDateTime(dashboardAsOf)} 기준</p>}
          </div>

          <Link to="/account" className="dashboard-page__section-link">
            내 계좌
            <ArrowRight size={14} />
          </Link>
        </div>

        {!account ? (
          <div className="dashboard-page__account-empty">
            <div className="dashboard-page__account-empty-icon">
              <Landmark size={21} />
            </div>

            <div>
              <strong>연결된 계좌가 없습니다.</strong>

              <p>계좌를 연결하면 자산과 평가 손익을 대시보드에서 확인할 수 있습니다.</p>
            </div>

            <Link to="/account" className="dashboard-page__inline-button">
              계좌 연결
            </Link>
          </div>
        ) : deposit ? (
          <div className="dashboard-page__assets">
            <div className="dashboard-page__asset-primary">
              <span>총 평가금액</span>

              <strong>{formatWon(deposit.totalEvaluationAmount)}</strong>
            </div>

            <div className="dashboard-page__asset-metrics">
              <div>
                <span>평가손익</span>

                <strong
                  className={
                    deposit.totalProfitLoss > 0
                      ? 'dashboard-page__number--rise'
                      : deposit.totalProfitLoss < 0
                        ? 'dashboard-page__number--fall'
                        : undefined
                  }
                >
                  {formatProfitLoss(deposit.totalProfitLoss)}
                </strong>
              </div>

              <div>
                <span>예수금</span>
                <strong>{formatWon(deposit.depositTotal)}</strong>
              </div>

              <div>
                <span>순자산</span>
                <strong>{formatWon(deposit.netAssetAmount)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-page__section-error">
            <AlertCircle size={16} />

            <div>
              <strong>자산 정보를 확인할 수 없습니다.</strong>

              <p>{assetError || '잠시 후 다시 조회해주세요.'}</p>
            </div>
          </div>
        )}
      </section>

      {/* 전략 운영 */}
      <section className="dashboard-page__section">
        <div className="dashboard-page__section-header">
          <div>
            <h2>전략 운영</h2>
            <p>현재 등록된 전략과 자동매매 상태입니다.</p>
          </div>

          <Link to="/strategies" className="dashboard-page__section-link">
            내 전략
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="dashboard-page__operation-summary">
          <div className="dashboard-page__operation-metric">
            <span>전체 전략</span>
            <strong>{strategies.length}</strong>
          </div>

          <div className="dashboard-page__operation-metric">
            <span>활성 전략</span>
            <strong>{activeStrategies.length}</strong>
          </div>

          <div className="dashboard-page__operation-metric">
            <span>자동매매</span>

            <strong>
              {enabledAutoTradings.length}
              <small> 실행 중</small>
            </strong>
          </div>
        </div>
      </section>

      {/* 활성 전략 */}
      <section className="dashboard-page__section">
        <div className="dashboard-page__section-header">
          <div>
            <h2>현재 운영 중인 전략</h2>
            <p>활성화된 전략의 자동매매 상태를 확인합니다.</p>
          </div>
        </div>

        {operatingStrategies.length === 0 ? (
          <div className="dashboard-page__empty">
            <Activity size={21} />

            <strong>활성화된 전략이 없습니다.</strong>

            <p>전략을 만들고 검증한 뒤 활성화하면 이곳에 표시됩니다.</p>

            <Link to="/strategies/new">전략 만들기</Link>
          </div>
        ) : (
          <div className="dashboard-page__strategy-list">
            {operatingStrategies.map((strategy) => {
              const autoTrading = autoTradingByStrategyId.get(strategy.strategyId);

              const isAutoTradingEnabled = autoTrading?.enabled === true;

              return (
                <button
                  key={strategy.strategyId}
                  type="button"
                  className="dashboard-page__strategy-row"
                  onClick={() => navigate(`/strategies/${strategy.strategyId}`)}
                >
                  <div className="dashboard-page__strategy-main">
                    <strong>{strategy.strategyName}</strong>

                    <span>{strategy.stockCode}</span>
                  </div>

                  <div className="dashboard-page__strategy-status">
                    <span className="dashboard-page__strategy-active">전략 활성화</span>

                    <span
                      className={
                        isAutoTradingEnabled
                          ? 'dashboard-page__auto-status dashboard-page__auto-status--running'
                          : 'dashboard-page__auto-status'
                      }
                    >
                      <Bot size={13} />

                      {isAutoTradingEnabled ? '자동매매 실행 중' : '자동매매 중지'}
                    </span>
                  </div>

                  <ChevronRight className="dashboard-page__row-arrow" size={17} />
                </button>
              );
            })}

            {activeStrategies.length > 4 && (
              <Link to="/strategies" className="dashboard-page__list-more">
                활성 전략 전체 보기
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* 최근 주문 */}
      <section className="dashboard-page__section">
        <div className="dashboard-page__section-header">
          <div>
            <h2>최근 주문</h2>
            <p>자동매매에서 발생한 최근 주문입니다.</p>
          </div>

          <Link to="/orders" className="dashboard-page__section-link">
            주문·체결
            <ArrowRight size={14} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="dashboard-page__empty dashboard-page__empty--compact">
            <WalletCards size={20} />

            <strong>아직 주문 내역이 없습니다.</strong>

            <p>자동매매에서 주문이 발생하면 이곳에서 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className="dashboard-page__order-list">
            <div className="dashboard-page__order-head">
              <span>종목</span>
              <span>구분</span>
              <span>수량</span>
              <span>기준 가격</span>
              <span>상태</span>
              <span>시간</span>
            </div>

            {orders.map((order) => (
              <button
                key={order.orderId}
                type="button"
                className="dashboard-page__order-row"
                onClick={() => navigate('/orders')}
              >
                <span className="dashboard-page__order-stock">
                  <strong>{order.stockCode}</strong>
                </span>

                <span
                  className={
                    order.orderType === 'BUY'
                      ? 'dashboard-page__order-type dashboard-page__order-type--buy'
                      : 'dashboard-page__order-type dashboard-page__order-type--sell'
                  }
                >
                  {getOrderTypeLabel(order.orderType)}
                </span>

                <span>{order.orderQuantity.toLocaleString('ko-KR')}주</span>

                <span>{formatWon(order.signalPrice)}</span>

                <span
                  className={`dashboard-page__order-status ${getOrderStatusClass(order.status)}`}
                >
                  {getOrderStatusLabel(order.status)}
                </span>

                <span className="dashboard-page__order-time">
                  {formatDateTime(order.createdAt)}
                </span>

                <ChevronRight className="dashboard-page__row-arrow" size={16} />
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default DashboardPage;
