import axios from 'axios';
import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { getExecutionDetail, getExecutions } from '../../api/execution';
import { getOrderDetail, getOrders } from '../../api/order';
import SlidingTabs from '../../components/common/SlidingTabs/SlidingTabs';

import type { Execution } from '../../types/execution';
import type { OrderDetail, OrderListItem, OrderStatus, OrderType } from '../../types/order';

import './OrdersPage.scss';

const PAGE_SIZE = 10;

type ViewTab = 'ORDERS' | 'EXECUTIONS';
type OrderTypeFilter = 'ALL' | OrderType;

function OrdersPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('ORDERS');

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);

  const [orderType, setOrderType] = useState<OrderTypeFilter>('ALL');

  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);

  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError('');

      if (activeTab === 'ORDERS') {
        const response = await getOrders({
          page,
          size: PAGE_SIZE,
          orderType: orderType === 'ALL' ? undefined : orderType,
        });

        setOrders(response.content);
        setTotalElements(response.totalElements);
        setTotalPages(response.totalPages);
      } else {
        const response = await getExecutions({
          page,
          size: PAGE_SIZE,
        });

        setExecutions(response.content);
        setTotalElements(response.totalElements);
        setTotalPages(response.totalPages);
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          activeTab === 'ORDERS'
            ? '주문 내역을 불러오지 못했습니다.'
            : '체결 내역을 불러오지 못했습니다.'
        )
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTabChange = (tab: ViewTab) => {
    if (tab === activeTab) {
      return;
    }

    setActiveTab(tab);
    setPage(0);
    setError('');
    setIsLoading(true);
  };

  const handleFilterChange = (nextOrderType: OrderTypeFilter) => {
    if (nextOrderType === orderType) {
      return;
    }

    setOrderType(nextOrderType);
    setPage(0);
    setIsLoading(true);
  };

  const handlePreviousPage = () => {
    if (page <= 0 || isLoading) {
      return;
    }

    setPage((previous) => previous - 1);
    setIsLoading(true);
  };

  const handleNextPage = () => {
    if (page >= totalPages - 1 || isLoading) {
      return;
    }

    setPage((previous) => previous + 1);
    setIsLoading(true);
  };

  const handleOpenOrderDetail = async (orderId: string) => {
    if (isDetailLoading) {
      return;
    }

    setSelectedOrderId(orderId);
    setSelectedExecutionId(null);
    setSelectedOrder(null);
    setSelectedExecution(null);
    setDetailError('');
    setIsDetailLoading(true);

    try {
      const response = await getOrderDetail(orderId);
      setSelectedOrder(response);
    } catch (requestError) {
      setDetailError(getErrorMessage(requestError, '주문 상세 정보를 불러오지 못했습니다.'));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenExecutionDetail = async (executionId: string) => {
    if (isDetailLoading) {
      return;
    }

    setSelectedExecutionId(executionId);
    setSelectedOrderId(null);
    setSelectedExecution(null);
    setSelectedOrder(null);
    setDetailError('');
    setIsDetailLoading(true);

    try {
      const response = await getExecutionDetail(executionId);
      setSelectedExecution(response);
    } catch (requestError) {
      setDetailError(getErrorMessage(requestError, '체결 상세 정보를 불러오지 못했습니다.'));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedOrderId(null);
    setSelectedExecutionId(null);
    setSelectedOrder(null);
    setSelectedExecution(null);
    setDetailError('');
    setIsDetailLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response =
          activeTab === 'ORDERS'
            ? await getOrders({
                page,
                size: PAGE_SIZE,
                orderType: orderType === 'ALL' ? undefined : orderType,
              })
            : await getExecutions({
                page,
                size: PAGE_SIZE,
              });

        if (cancelled) {
          return;
        }

        if (activeTab === 'ORDERS') {
          setOrders(response.content as OrderListItem[]);
        } else {
          setExecutions(response.content as Execution[]);
        }

        setTotalElements(response.totalElements);
        setTotalPages(response.totalPages);
        setError('');
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(
          getErrorMessage(
            requestError,
            activeTab === 'ORDERS'
              ? '주문 내역을 불러오지 못했습니다.'
              : '체결 내역을 불러오지 못했습니다.'
          )
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, orderType, page]);

  useEffect(() => {
    const detailOpened = selectedOrderId || selectedExecutionId;

    if (!detailOpened) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseDetail();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedOrderId, selectedExecutionId]);

  const isEmpty = activeTab === 'ORDERS' ? orders.length === 0 : executions.length === 0;

  return (
    <>
      <main className="orders-page">
        <header className="orders-page__header">
          <div>
            <h1>주문·체결</h1>
            <p>자동매매에서 발생한 주문과 실제 체결 내역을 확인합니다.</p>
          </div>

          <button
            type="button"
            className="orders-page__refresh"
            disabled={isLoading || isRefreshing}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw
              size={16}
              className={
                isRefreshing
                  ? 'orders-page__refresh-icon orders-page__refresh-icon--loading'
                  : 'orders-page__refresh-icon'
              }
            />
            새로고침
          </button>
        </header>

        <div className="orders-page__view-tabs">
          <SlidingTabs<ViewTab>
            items={[
              { value: 'ORDERS', label: '주문' },
              { value: 'EXECUTIONS', label: '체결' },
            ]}
            value={activeTab}
            onChange={handleTabChange}
            variant="pill"
            size="lg"
            ariaLabel="주문 및 체결"
          />
        </div>

        <section className="orders-page__toolbar">
          {activeTab === 'ORDERS' ? (
            <div className="orders-page__filters">
              <SlidingTabs<OrderTypeFilter>
                items={[
                  { value: 'ALL', label: '전체' },
                  { value: 'BUY', label: '매수' },
                  { value: 'SELL', label: '매도' },
                ]}
                value={orderType}
                onChange={handleFilterChange}
                variant="underline"
                size="sm"
                ariaLabel="주문 유형"
              />
            </div>
          ) : (
            <span className="orders-page__toolbar-title">체결 내역</span>
          )}

          {!isLoading && !error && (
            <span className="orders-page__count">총 {totalElements.toLocaleString('ko-KR')}건</span>
          )}
        </section>

        {isLoading ? (
          <PageState>
            <LoaderCircle className="orders-page__spinner" size={22} />
            <span>
              {activeTab === 'ORDERS'
                ? '주문 내역을 불러오고 있습니다.'
                : '체결 내역을 불러오고 있습니다.'}
            </span>
          </PageState>
        ) : error ? (
          <PageState>
            <AlertCircle size={21} />

            <div>
              <strong>
                {activeTab === 'ORDERS'
                  ? '주문 내역을 불러오지 못했습니다.'
                  : '체결 내역을 불러오지 못했습니다.'}
              </strong>

              <p>{error}</p>

              <button type="button" onClick={() => void handleRefresh()}>
                다시 시도
              </button>
            </div>
          </PageState>
        ) : isEmpty ? (
          <div className="orders-page__empty">
            <strong>
              {activeTab === 'ORDERS'
                ? orderType === 'ALL'
                  ? '아직 주문 내역이 없습니다.'
                  : `${getOrderTypeLabel(orderType)} 주문 내역이 없습니다.`
                : '아직 체결 내역이 없습니다.'}
            </strong>

            <p>
              {activeTab === 'ORDERS'
                ? '활성화된 전략의 조건이 충족되어 주문이 발생하면 이곳에서 확인할 수 있습니다.'
                : '주문이 실제로 체결되면 평균 체결가와 체결 금액을 이곳에서 확인할 수 있습니다.'}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'ORDERS' ? (
              <>
                <div className="orders-page__table-wrap">
                  <table className="orders-page__table">
                    <thead>
                      <tr>
                        <th>종목</th>
                        <th>구분</th>
                        <th>기준 가격</th>
                        <th>주문 금액</th>
                        <th>체결 수량</th>
                        <th>상태</th>
                        <th>주문 시간</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.map((order) => (
                        <OrderRow
                          key={order.orderId}
                          order={order}
                          onClick={() => void handleOpenOrderDetail(order.orderId)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="orders-page__mobile-list">
                  {orders.map((order) => (
                    <MobileOrderItem
                      key={order.orderId}
                      order={order}
                      onClick={() => void handleOpenOrderDetail(order.orderId)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="orders-page__table-wrap">
                  <table className="orders-page__execution-table">
                    <thead>
                      <tr>
                        <th>증권사 주문번호</th>
                        <th>체결 수량</th>
                        <th>평균 체결가</th>
                        <th>총 체결금액</th>
                        <th>미체결 수량</th>
                        <th>체결 시간</th>
                      </tr>
                    </thead>

                    <tbody>
                      {executions.map((execution) => (
                        <ExecutionRow
                          key={execution.executionId}
                          execution={execution}
                          onClick={() => void handleOpenExecutionDetail(execution.executionId)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="orders-page__mobile-list">
                  {executions.map((execution) => (
                    <MobileExecutionItem
                      key={execution.executionId}
                      execution={execution}
                      onClick={() => void handleOpenExecutionDetail(execution.executionId)}
                    />
                  ))}
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="orders-page__pagination">
                <button
                  type="button"
                  aria-label="이전 페이지"
                  disabled={page === 0 || isLoading}
                  onClick={handlePreviousPage}
                >
                  <ChevronLeft size={17} />
                </button>

                <span>
                  <strong>{page + 1}</strong>
                  <span>/</span>
                  <span>{totalPages}</span>
                </span>

                <button
                  type="button"
                  aria-label="다음 페이지"
                  disabled={page >= totalPages - 1 || isLoading}
                  onClick={handleNextPage}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedOrderId && (
        <OrderDetailPanel
          order={selectedOrder}
          isLoading={isDetailLoading}
          error={detailError}
          onClose={handleCloseDetail}
        />
      )}

      {selectedExecutionId && (
        <ExecutionDetailPanel
          execution={selectedExecution}
          isLoading={isDetailLoading}
          error={detailError}
          onClose={handleCloseDetail}
        />
      )}
    </>
  );
}

function OrderRow({ order, onClick }: { order: OrderListItem; onClick: () => void }) {
  return (
    <tr
      className="orders-page__clickable-row"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <td>
        <strong>{order.stockCode}</strong>
      </td>

      <td>
        <OrderTypeBadge type={order.orderType} />
      </td>

      <td>
        <strong className="orders-page__price">{formatWon(order.signalPrice)}</strong>
      </td>

      <td>{formatWon(order.estimatedOrderAmount)}</td>

      <td>
        <div className="orders-page__quantity">
          <strong>{order.filledQuantity.toLocaleString('ko-KR')}</strong>
          <span>/ {order.orderQuantity.toLocaleString('ko-KR')}주</span>
        </div>
      </td>

      <td>
        <OrderStatusLabel status={order.status} />
      </td>

      <td className="orders-page__date">{formatDateTime(order.createdAt)}</td>
    </tr>
  );
}

function ExecutionRow({ execution, onClick }: { execution: Execution; onClick: () => void }) {
  return (
    <tr
      className="orders-page__clickable-row"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <td>
        <strong className="orders-page__broker-number">{execution.brokerOrderNo || '-'}</strong>
      </td>

      <td>{execution.executedQuantity.toLocaleString('ko-KR')}주</td>

      <td>
        <strong className="orders-page__price">{formatWon(execution.averageExecutionPrice)}</strong>
      </td>

      <td>{formatWon(execution.totalExecutionAmount)}</td>

      <td>{execution.remainingQuantity.toLocaleString('ko-KR')}주</td>

      <td className="orders-page__date">{formatDateTime(execution.createdAt)}</td>
    </tr>
  );
}

function MobileOrderItem({ order, onClick }: { order: OrderListItem; onClick: () => void }) {
  return (
    <article
      className="orders-page__mobile-item"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="orders-page__mobile-top">
        <div>
          <strong className="orders-page__mobile-stock">{order.stockCode}</strong>
          <OrderTypeBadge type={order.orderType} />
        </div>

        <OrderStatusLabel status={order.status} />
      </div>

      <div className="orders-page__mobile-values">
        <div>
          <span>기준 가격</span>
          <strong>{formatWon(order.signalPrice)}</strong>
        </div>

        <div>
          <span>주문 금액</span>
          <strong>{formatWon(order.estimatedOrderAmount)}</strong>
        </div>

        <div>
          <span>체결 수량</span>
          <strong>
            {order.filledQuantity.toLocaleString('ko-KR')}
            <small> / {order.orderQuantity.toLocaleString('ko-KR')}주</small>
          </strong>
        </div>
      </div>

      <div className="orders-page__mobile-bottom">
        <span>{formatDateTime(order.createdAt)}</span>

        {order.status === 'FAILED' && order.failureMessage && (
          <span className="orders-page__failure">{order.failureMessage}</span>
        )}
      </div>
    </article>
  );
}

function MobileExecutionItem({
  execution,
  onClick,
}: {
  execution: Execution;
  onClick: () => void;
}) {
  return (
    <article
      className="orders-page__mobile-item"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="orders-page__mobile-top">
        <div className="orders-page__execution-mobile-title">
          <span>증권사 주문번호</span>
          <strong>{execution.brokerOrderNo || '-'}</strong>
        </div>
      </div>

      <div className="orders-page__mobile-values">
        <div>
          <span>평균 체결가</span>
          <strong>{formatWon(execution.averageExecutionPrice)}</strong>
        </div>

        <div>
          <span>체결 금액</span>
          <strong>{formatWon(execution.totalExecutionAmount)}</strong>
        </div>

        <div>
          <span>체결 수량</span>
          <strong>{execution.executedQuantity.toLocaleString('ko-KR')}주</strong>
        </div>
      </div>

      <div className="orders-page__mobile-bottom">
        <span>{formatDateTime(execution.createdAt)}</span>

        <span>미체결 {execution.remainingQuantity.toLocaleString('ko-KR')}주</span>
      </div>
    </article>
  );
}

function OrderDetailPanel({
  order,
  isLoading,
  error,
  onClose,
}: {
  order: OrderDetail | null;
  isLoading: boolean;
  error: string;
  onClose: () => void;
}) {
  return (
    <DetailShell title="주문 상세" onClose={onClose}>
      {isLoading ? (
        <DetailLoading text="주문 정보를 불러오고 있습니다." />
      ) : error ? (
        <DetailError message={error} />
      ) : order ? (
        <>
          <section className="orders-page__detail-summary">
            <div className="orders-page__detail-summary-top">
              <div>
                <strong className="orders-page__detail-stock">{order.stockCode}</strong>
                <OrderTypeBadge type={order.orderType} />
              </div>

              <OrderStatusLabel status={order.status} />
            </div>

            <div className="orders-page__detail-price">
              <span>기준 가격</span>
              <strong>{formatWon(order.signalPrice)}</strong>
            </div>
          </section>

          <section className="orders-page__detail-section">
            <h3>주문 정보</h3>

            <div className="orders-page__detail-values">
              <DetailValue
                label="주문 수량"
                value={`${order.orderQuantity.toLocaleString('ko-KR')}주`}
              />
              <DetailValue
                label="체결 수량"
                value={`${order.filledQuantity.toLocaleString('ko-KR')}주`}
              />
              <DetailValue
                label="미체결 수량"
                value={`${order.remainingQuantity.toLocaleString('ko-KR')}주`}
              />
              <DetailValue label="예상 주문 금액" value={formatWon(order.estimatedOrderAmount)} />
            </div>
          </section>

          <section className="orders-page__detail-section">
            <h3>처리 정보</h3>

            <div className="orders-page__detail-list">
              <DetailRow label="증권사 주문번호" value={order.brokerOrderNo || '-'} />
              <DetailRow label="주문 시간" value={formatFullDateTime(order.createdAt)} />
              <DetailRow label="최종 변경" value={formatFullDateTime(order.updatedAt)} />
            </div>
          </section>

          {(order.failureCode || order.failureMessage) && (
            <section className="orders-page__detail-failure">
              <div>
                <AlertCircle size={18} />
                <strong>주문 처리 중 문제가 발생했습니다.</strong>
              </div>

              {order.failureCode && (
                <p>
                  <span>오류 코드</span>
                  <strong>{order.failureCode}</strong>
                </p>
              )}

              {order.failureMessage && <p>{order.failureMessage}</p>}
            </section>
          )}

          <section className="orders-page__detail-identifiers">
            <DetailRow label="주문 ID" value={order.orderId} />
            <DetailRow label="전략 ID" value={order.strategyId} />
            <DetailRow label="자동매매 ID" value={order.autoTradingId} />
          </section>
        </>
      ) : null}
    </DetailShell>
  );
}

function ExecutionDetailPanel({
  execution,
  isLoading,
  error,
  onClose,
}: {
  execution: Execution | null;
  isLoading: boolean;
  error: string;
  onClose: () => void;
}) {
  return (
    <DetailShell title="체결 상세" onClose={onClose}>
      {isLoading ? (
        <DetailLoading text="체결 정보를 불러오고 있습니다." />
      ) : error ? (
        <DetailError message={error} />
      ) : execution ? (
        <>
          <section className="orders-page__detail-summary">
            <div className="orders-page__detail-execution-label">체결 완료</div>

            <div className="orders-page__detail-price">
              <span>평균 체결가</span>
              <strong>{formatWon(execution.averageExecutionPrice)}</strong>
            </div>
          </section>

          <section className="orders-page__detail-section">
            <h3>체결 정보</h3>

            <div className="orders-page__detail-values">
              <DetailValue
                label="체결 수량"
                value={`${execution.executedQuantity.toLocaleString('ko-KR')}주`}
              />

              <DetailValue label="총 체결 금액" value={formatWon(execution.totalExecutionAmount)} />

              <DetailValue
                label="미체결 수량"
                value={`${execution.remainingQuantity.toLocaleString('ko-KR')}주`}
              />

              <DetailValue label="평균 체결가" value={formatWon(execution.averageExecutionPrice)} />
            </div>
          </section>

          <section className="orders-page__detail-section">
            <h3>처리 정보</h3>

            <div className="orders-page__detail-list">
              <DetailRow label="증권사 주문번호" value={execution.brokerOrderNo || '-'} />

              <DetailRow label="체결 생성" value={formatFullDateTime(execution.createdAt)} />

              <DetailRow label="최종 변경" value={formatFullDateTime(execution.updatedAt)} />
            </div>
          </section>

          <section className="orders-page__detail-identifiers">
            <DetailRow label="체결 ID" value={execution.executionId} />
            <DetailRow label="주문 ID" value={execution.orderId} />
            <DetailRow label="전략 ID" value={execution.strategyId} />
            <DetailRow label="자동매매 ID" value={execution.autoTradingId} />
          </section>
        </>
      ) : null}
    </DetailShell>
  );
}

function DetailShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="orders-page__detail-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className="orders-page__detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="orders-page__detail-header">
          <div>
            <span>주문·체결</span>
            <h2>{title}</h2>
          </div>

          <button type="button" aria-label={`${title} 닫기`} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="orders-page__detail-content">{children}</div>

        <footer className="orders-page__detail-footer">
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </footer>
      </aside>
    </div>
  );
}

function DetailLoading({ text }: { text: string }) {
  return (
    <div className="orders-page__detail-state">
      <LoaderCircle className="orders-page__spinner" size={22} />
      <span>{text}</span>
    </div>
  );
}

function DetailError({ message }: { message: string }) {
  return (
    <div className="orders-page__detail-state">
      <AlertCircle size={22} />

      <div>
        <strong>상세 정보를 불러오지 못했습니다.</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="orders-page__detail-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="orders-page__detail-row">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function OrderTypeBadge({ type }: { type: OrderType }) {
  return (
    <span className={`orders-page__type orders-page__type--${type.toLowerCase()}`}>
      {getOrderTypeLabel(type)}
    </span>
  );
}

function OrderStatusLabel({ status }: { status: OrderStatus }) {
  return (
    <span className={`orders-page__status orders-page__status--${getStatusTone(status)}`}>
      <span className="orders-page__status-dot" />
      {getOrderStatusLabel(status)}
    </span>
  );
}

function PageState({ children }: { children: ReactNode }) {
  return <div className="orders-page__state">{children}</div>;
}

function getOrderTypeLabel(type: OrderType): string {
  return type === 'BUY' ? '매수' : '매도';
}

function getOrderStatusLabel(status: OrderStatus): string {
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
  }
}

function getStatusTone(
  status: OrderStatus
): 'pending' | 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'REQUESTED':
    case 'PROCESSING':
    case 'ACCEPTED':
      return 'pending';

    case 'FILLED':
      return 'success';

    case 'PARTIALLY_FILLED':
    case 'TIMEOUT':
      return 'warning';

    case 'FAILED':
    case 'PARTIALLY_FILLED_REJECTED':
      return 'error';

    case 'CANCELED':
      return 'neutral';
  }
}

function formatWon(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${value.toLocaleString('ko-KR')}원`;
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

function formatFullDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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

export default OrdersPage;
