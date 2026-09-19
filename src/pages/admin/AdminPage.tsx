import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  FileSearch,
  LogOut,
  Plus,
  RefreshCw,
  ShoppingCart,
  X,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { handleLogout } from '../../utils/logout';

import {
  createPromptVersion,
  getAdminAutoTradings,
  getAdminOrders,
  getAiAuditDetail,
  getAiFailureHistory,
  getGlobalSuspension,
  getPromptVersions,
  updateAutoTradingSuspension,
  updateGlobalSuspension,
} from '../../api/admin';

import type {
  AdminAutoTrading,
  AdminOrder,
  AdminTab,
  AiAnalysisFailureType,
  AiAuditDetail,
  AiFailureHistoryItem,
  AiPromptKey,
  AiPromptVersion,
  AiPromptVersionCreateRequest,
  GlobalSuspension,
  PageResponse,
} from '../../types/admin';

import './AdminPage.scss';

const PAGE_SIZE = 20;
const PROMPT_PAGE_SIZE = 50;

const FAILURE_TYPES: {
  value: AiAnalysisFailureType;
  label: string;
}[] = [
  { value: 'LLM_API_ERROR', label: 'LLM API 오류' },
  { value: 'RESPONSE_PARSE_ERROR', label: '응답 파싱 오류' },
  { value: 'VALIDATION_ERROR', label: '응답 검증 오류' },
  { value: 'PROMPT_NOT_FOUND', label: '프롬프트 없음' },
  { value: 'INTERNAL_ERROR', label: '내부 오류' },
];

const PROMPT_KEYS: {
  value: AiPromptKey;
  label: string;
  description: string;
}[] = [
  {
    value: 'STRATEGY_RISK_ANALYSIS',
    label: '전략 위험 분석',
    description: '전략과 백테스트 결과를 기반으로 투자 위험을 분석합니다.',
  },
  {
    value: 'BACKTEST_ANALYSIS',
    label: '백테스트 분석',
    description: '백테스트 결과를 중심으로 성과와 위험 요인을 분석합니다.',
  },
];

const emptyPage = <T,>(): PageResponse<T> => ({
  content: [],
  page: 0,
  size: PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
});

function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('AUTO_TRADING');

  const [globalSuspension, setGlobalSuspension] = useState<GlobalSuspension | null>(null);

  const [autoTradings, setAutoTradings] = useState<PageResponse<AdminAutoTrading>>(emptyPage());

  const [orders, setOrders] = useState<PageResponse<AdminOrder>>(emptyPage());

  const [promptVersions, setPromptVersions] = useState<PageResponse<AiPromptVersion>>(emptyPage());

  const [aiFailures, setAiFailures] = useState<PageResponse<AiFailureHistoryItem>>(emptyPage());

  const [autoTradingPage, setAutoTradingPage] = useState(0);
  const [orderPage, setOrderPage] = useState(0);
  const [aiFailurePage, setAiFailurePage] = useState(0);

  const [failureType, setFailureType] = useState<AiAnalysisFailureType | ''>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isGlobalUpdating, setIsGlobalUpdating] = useState(false);
  const [updatingAutoTradingId, setUpdatingAutoTradingId] = useState<string | null>(null);

  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false);

  const [auditId, setAuditId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AiAuditDetail | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleAdminLogout = async () => {
    await handleLogout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    document.title = '운영 관리 | SAJO';
  }, []);

  const loadGlobalSuspension = useCallback(async () => {
    const result = await getGlobalSuspension();
    setGlobalSuspension(result);
  }, []);

  const loadAutoTradings = useCallback(async () => {
    const result = await getAdminAutoTradings(autoTradingPage, PAGE_SIZE);
    setAutoTradings(result);
  }, [autoTradingPage]);

  const loadOrders = useCallback(async () => {
    const result = await getAdminOrders(orderPage, PAGE_SIZE);
    setOrders(result);
  }, [orderPage]);

  const loadAi = useCallback(async () => {
    const [prompts, failures] = await Promise.all([
      getPromptVersions(0, PROMPT_PAGE_SIZE),
      getAiFailureHistory(aiFailurePage, PAGE_SIZE, failureType || undefined),
    ]);

    setPromptVersions(prompts);
    setAiFailures(failures);
  }, [aiFailurePage, failureType]);

  const loadCurrentTab = useCallback(async () => {
    setError(null);

    try {
      if (activeTab === 'AUTO_TRADING') {
        await Promise.all([loadGlobalSuspension(), loadAutoTradings()]);
      } else if (activeTab === 'ORDERS') {
        await loadOrders();
      } else {
        await loadAi();
      }
    } catch {
      setError('운영 정보를 불러오지 못했습니다.');
    }
  }, [activeTab, loadAi, loadAutoTradings, loadGlobalSuspension, loadOrders]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const load = async () => {
        setIsLoading(true);
        await loadCurrentTab();
        setIsLoading(false);
      };

      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCurrentTab]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCurrentTab();
    setIsRefreshing(false);
  };

  const handleGlobalSuspension = async () => {
    if (!globalSuspension || isGlobalUpdating) return;

    const next = !globalSuspension.suspended;

    const confirmed = window.confirm(
      next
        ? '전체 자동매매를 긴급 중단하시겠습니까?\n모든 자동매매의 운영에 영향을 줍니다.'
        : '전체 자동매매 운영을 재개하시겠습니까?'
    );

    if (!confirmed) return;

    setIsGlobalUpdating(true);
    setError(null);

    try {
      await updateGlobalSuspension(next);
      await Promise.all([loadGlobalSuspension(), loadAutoTradings()]);
    } catch {
      setError(
        next ? '전체 자동매매를 중단하지 못했습니다.' : '전체 자동매매를 재개하지 못했습니다.'
      );
    } finally {
      setIsGlobalUpdating(false);
    }
  };

  const handleAutoTradingSuspension = async (item: AdminAutoTrading) => {
    if (updatingAutoTradingId) return;

    const next = !item.adminSuspended;

    const confirmed = window.confirm(
      next
        ? '선택한 자동매매를 관리자 권한으로 중단하시겠습니까?'
        : '선택한 자동매매를 재개하시겠습니까?'
    );

    if (!confirmed) return;

    setUpdatingAutoTradingId(item.autoTradingId);

    try {
      await updateAutoTradingSuspension(item.autoTradingId, next);
      await loadAutoTradings();
    } catch {
      setError('자동매매 상태를 변경하지 못했습니다.');
    } finally {
      setUpdatingAutoTradingId(null);
    }
  };

  const handleAuditOpen = async (analysisId: string) => {
    setAuditId(analysisId);
    setAudit(null);
    setAuditError(null);
    setAuditLoading(true);

    try {
      setAudit(await getAiAuditDetail(analysisId));
    } catch {
      setAuditError('Audit 기록을 불러오지 못했습니다.');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAuditClose = () => {
    setAuditId(null);
    setAudit(null);
    setAuditError(null);
  };

  const handlePromptCreated = async () => {
    setPromptDrawerOpen(false);

    try {
      const prompts = await getPromptVersions(0, PROMPT_PAGE_SIZE);
      setPromptVersions(prompts);
    } catch {
      setError('프롬프트 버전 정보를 다시 불러오지 못했습니다.');
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-page__inner">
        <header className="admin-header">
          <div>
            <span className="admin-header__eyebrow">SAJO ADMIN</span>
            <h1>운영 관리</h1>
            <p>자동매매 운영 상태와 주문, AI 분석 품질을 한곳에서 관리합니다.</p>
          </div>

          <div className="admin-header__actions">
            <button
              type="button"
              className="admin-refresh"
              disabled={isRefreshing}
              onClick={() => void handleRefresh()}
            >
              <RefreshCw size={16} className={isRefreshing ? 'is-spinning' : ''} />
              <span>새로고침</span>
            </button>

            <button type="button" className="admin-logout" onClick={() => void handleAdminLogout()}>
              <LogOut size={16} />
              <span>로그아웃</span>
            </button>
          </div>
        </header>

        <OperationBar
          suspension={globalSuspension}
          loading={isGlobalUpdating}
          onToggle={() => void handleGlobalSuspension()}
        />

        <nav className="admin-tabs">
          <TabButton
            active={activeTab === 'AUTO_TRADING'}
            icon={<Activity size={17} />}
            label="자동매매"
            onClick={() => setActiveTab('AUTO_TRADING')}
          />

          <TabButton
            active={activeTab === 'ORDERS'}
            icon={<ShoppingCart size={17} />}
            label="주문"
            onClick={() => setActiveTab('ORDERS')}
          />

          <TabButton
            active={activeTab === 'AI'}
            icon={<Bot size={17} />}
            label="AI 운영"
            onClick={() => setActiveTab('AI')}
          />
        </nav>

        {error && (
          <div className="admin-error">
            <AlertTriangle size={17} />
            <span>{error}</span>
            <button type="button" onClick={() => void handleRefresh()}>
              다시 시도
            </button>
          </div>
        )}

        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'AUTO_TRADING' && (
              <AutoTradingView
                data={autoTradings}
                globalSuspended={globalSuspension?.suspended ?? false}
                updatingId={updatingAutoTradingId}
                onToggle={handleAutoTradingSuspension}
                onPageChange={setAutoTradingPage}
              />
            )}

            {activeTab === 'ORDERS' && <OrdersView data={orders} onPageChange={setOrderPage} />}

            {activeTab === 'AI' && (
              <AiOperationsView
                prompts={promptVersions}
                failures={aiFailures}
                failureType={failureType}
                onFailureTypeChange={(value) => {
                  setAiFailurePage(0);
                  setFailureType(value);
                }}
                onPromptCreate={() => setPromptDrawerOpen(true)}
                onAuditOpen={(id) => void handleAuditOpen(id)}
                onPageChange={setAiFailurePage}
              />
            )}
          </>
        )}
      </div>

      {promptDrawerOpen && (
        <PromptCreateDrawer
          onClose={() => setPromptDrawerOpen(false)}
          onCreated={() => void handlePromptCreated()}
        />
      )}

      {auditId && (
        <AuditDrawer
          audit={audit}
          loading={auditLoading}
          error={auditError}
          onClose={handleAuditClose}
        />
      )}
    </main>
  );
}

function OperationBar({
  suspension,
  loading,
  onToggle,
}: {
  suspension: GlobalSuspension | null;
  loading: boolean;
  onToggle: () => void;
}) {
  if (!suspension) return null;

  return (
    <section className={`operation-bar ${suspension.suspended ? 'operation-bar--stopped' : ''}`}>
      <div className="operation-bar__status">
        <span className="operation-bar__indicator" />

        <div>
          <span>자동매매 운영 상태</span>
          <strong>{suspension.suspended ? '전체 중단' : '정상 운영'}</strong>
        </div>
      </div>

      <p>
        {suspension.suspended
          ? '관리자에 의해 전체 자동매매가 중단되어 있습니다.'
          : '전체 자동매매 서비스가 정상적으로 운영되고 있습니다.'}
      </p>

      <button
        type="button"
        className={suspension.suspended ? 'operation-bar__resume' : 'operation-bar__stop'}
        disabled={loading}
        onClick={onToggle}
      >
        {suspension.suspended ? <CirclePlay size={16} /> : <CirclePause size={16} />}

        {loading ? '처리 중' : suspension.suspended ? '전체 자동매매 재개' : '전체 긴급 중단'}
      </button>
    </section>
  );
}

function AutoTradingView({
  data,
  globalSuspended,
  updatingId,
  onToggle,
  onPageChange,
}: {
  data: PageResponse<AdminAutoTrading>;
  globalSuspended: boolean;
  updatingId: string | null;
  onToggle: (item: AdminAutoTrading) => Promise<void>;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="admin-content">
      <SectionHeading
        title="자동매매 운영"
        description="사용자별 자동매매 실행 상태와 최근 주문 결과를 확인합니다."
        count={data.totalElements}
      />

      {data.content.length === 0 ? (
        <EmptyState message="등록된 자동매매가 없습니다." />
      ) : (
        <>
          <TableWrap>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>운영 상태</th>
                  <th>방향</th>
                  <th>사용자</th>
                  <th>전략</th>
                  <th>최근 주문</th>
                  <th>최근 실패</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {data.content.map((item) => {
                  const stopped = globalSuspended || item.adminSuspended;

                  return (
                    <tr key={item.autoTradingId}>
                      <td>
                        <StatusPill
                          tone={stopped ? 'danger' : item.enabled ? 'success' : 'neutral'}
                        >
                          {stopped ? '관리자 중단' : item.enabled ? '실행 중' : '비활성'}
                        </StatusPill>
                      </td>

                      <td>{directionLabel(item.direction)}</td>
                      <td>
                        <ShortId value={item.userId} />
                      </td>
                      <td>
                        <ShortId value={item.strategyId} />
                      </td>

                      <td>
                        {item.latestOrderStatus ? (
                          <div className="table-stack">
                            <span>{orderStatusLabel(item.latestOrderStatus)}</span>
                            {item.latestOrderCreatedAt && (
                              <small>{formatDate(item.latestOrderCreatedAt)}</small>
                            )}
                          </div>
                        ) : (
                          <Muted />
                        )}
                      </td>

                      <td>
                        {item.latestFailureCode ? (
                          <span
                            className="table-error-text"
                            title={item.latestFailureMessage ?? ''}
                          >
                            {item.latestFailureCode}
                          </span>
                        ) : (
                          <Muted />
                        )}
                      </td>

                      <td className="table-action">
                        <button
                          type="button"
                          className={
                            item.adminSuspended
                              ? 'table-button table-button--resume'
                              : 'table-button'
                          }
                          disabled={globalSuspended || updatingId === item.autoTradingId}
                          onClick={() => void onToggle(item)}
                        >
                          {updatingId === item.autoTradingId
                            ? '처리 중'
                            : item.adminSuspended
                              ? '재개'
                              : '중단'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>

          <Pagination data={data} onChange={onPageChange} />
        </>
      )}
    </section>
  );
}

function OrdersView({
  data,
  onPageChange,
}: {
  data: PageResponse<AdminOrder>;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="admin-content">
      <SectionHeading
        title="전체 주문"
        description="자동매매에서 생성된 주문과 체결 진행 상태를 확인합니다."
        count={data.totalElements}
      />

      {data.content.length === 0 ? (
        <EmptyState message="주문 이력이 없습니다." />
      ) : (
        <>
          <TableWrap>
            <table className="admin-table admin-table--orders">
              <thead>
                <tr>
                  <th>상태</th>
                  <th>종목</th>
                  <th>구분</th>
                  <th>주문</th>
                  <th>체결</th>
                  <th>예상 주문금액</th>
                  <th>실패</th>
                  <th>요청 시각</th>
                </tr>
              </thead>

              <tbody>
                {data.content.map((order) => (
                  <tr
                    key={order.orderId}
                    className={order.status === 'TIMEOUT' ? 'is-warning' : ''}
                  >
                    <td>
                      <StatusPill
                        tone={
                          order.status === 'FILLED'
                            ? 'success'
                            : order.status === 'FAILED' || order.status === 'TIMEOUT'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {orderStatusLabel(order.status)}
                      </StatusPill>
                    </td>

                    <td className="table-primary">{order.stockCode}</td>

                    <td>
                      <span className={order.orderType === 'BUY' ? 'order-buy' : 'order-sell'}>
                        {order.orderType === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>

                    <td>{order.orderQuantity.toLocaleString()}주</td>
                    <td>{order.filledQuantity.toLocaleString()}주</td>
                    <td>{order.estimatedOrderAmount.toLocaleString()}원</td>

                    <td>
                      {order.failureCode ? (
                        <span className="table-error-text" title={order.failureMessage ?? ''}>
                          {order.failureCode}
                        </span>
                      ) : (
                        <Muted />
                      )}
                    </td>

                    <td>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <Pagination data={data} onChange={onPageChange} />
        </>
      )}
    </section>
  );
}

function AiOperationsView({
  prompts,
  failures,
  failureType,
  onFailureTypeChange,
  onPromptCreate,
  onAuditOpen,
  onPageChange,
}: {
  prompts: PageResponse<AiPromptVersion>;
  failures: PageResponse<AiFailureHistoryItem>;
  failureType: AiAnalysisFailureType | '';
  onFailureTypeChange: (value: AiAnalysisFailureType | '') => void;
  onPromptCreate: () => void;
  onAuditOpen: (id: string) => void;
  onPageChange: (page: number) => void;
}) {
  const activePrompts = useMemo(
    () => prompts.content.filter((prompt) => prompt.status === 'ACTIVE'),
    [prompts.content]
  );

  return (
    <div className="ai-operations">
      <section className="admin-content">
        <div className="section-heading section-heading--action">
          <div>
            <h2>프롬프트 운영</h2>
            <p>현재 분석에 사용되는 프롬프트와 버전별 실패율을 관리합니다.</p>
          </div>

          <button type="button" className="primary-action" onClick={onPromptCreate}>
            <Plus size={16} />새 버전 등록
          </button>
        </div>

        <div className="prompt-current-grid">
          {PROMPT_KEYS.map((key) => {
            const active = activePrompts.find((prompt) => prompt.promptKey === key.value);

            return (
              <article className="prompt-current" key={key.value}>
                <div className="prompt-current__top">
                  <div>
                    <span className="prompt-current__label">{key.label}</span>

                    <strong>{active ? active.version : 'ACTIVE 버전 없음'}</strong>
                  </div>

                  <StatusPill tone={active ? 'success' : 'danger'}>
                    {active ? 'ACTIVE' : '미등록'}
                  </StatusPill>
                </div>

                <p>{key.description}</p>

                {active && (
                  <div className="prompt-current__metrics">
                    <Metric value={active.totalCount.toLocaleString()} label="분석" />
                    <Metric value={active.failedCount.toLocaleString()} label="실패" />
                    <Metric
                      value={`${active.failureRate.toFixed(1)}%`}
                      label="실패율"
                      danger={active.failureRate > 0}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="subsection-heading">
          <h3>버전 이력</h3>
          <span>{prompts.totalElements.toLocaleString()}개 버전</span>
        </div>

        {prompts.content.length === 0 ? (
          <EmptyState message="등록된 프롬프트 버전이 없습니다." />
        ) : (
          <TableWrap>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>분석 유형</th>
                  <th>버전</th>
                  <th>상태</th>
                  <th>분석 수</th>
                  <th>실패</th>
                  <th>실패율</th>
                  <th>배포 시각</th>
                </tr>
              </thead>

              <tbody>
                {prompts.content.map((prompt) => (
                  <tr key={prompt.id}>
                    <td className="table-primary">{promptKeyLabel(prompt.promptKey)}</td>

                    <td>{prompt.version}</td>

                    <td>
                      <StatusPill tone={prompt.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {prompt.status}
                      </StatusPill>
                    </td>

                    <td>{prompt.totalCount.toLocaleString()}</td>
                    <td>{prompt.failedCount.toLocaleString()}</td>

                    <td>
                      <span className={prompt.failureRate > 0 ? 'failure-rate' : ''}>
                        {prompt.failureRate.toFixed(1)}%
                      </span>
                    </td>

                    <td>{formatDate(prompt.deployedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>

      <section className="admin-content ai-failures">
        <div className="section-heading section-heading--action">
          <div>
            <h2>분석 실패 이력</h2>
            <p>실패 원인을 확인하고 저장된 요청·응답·검증 기록을 추적합니다.</p>
          </div>

          <select
            className="admin-select"
            value={failureType}
            onChange={(event) =>
              onFailureTypeChange(event.target.value as AiAnalysisFailureType | '')
            }
          >
            <option value="">전체 실패 유형</option>

            {FAILURE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {failures.content.length === 0 ? (
          <EmptyState message="조건에 해당하는 분석 실패가 없습니다." />
        ) : (
          <>
            <TableWrap>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>실패 유형</th>
                    <th>분석 ID</th>
                    <th>사용자</th>
                    <th>전략</th>
                    <th>실패 메시지</th>
                    <th>발생 시각</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {failures.content.map((failure) => (
                    <tr key={failure.analysisId}>
                      <td>
                        <StatusPill tone="danger">
                          {failureTypeLabel(failure.failureType)}
                        </StatusPill>
                      </td>

                      <td>
                        <ShortId value={failure.analysisId} />
                      </td>
                      <td>
                        <ShortId value={failure.userId} />
                      </td>
                      <td>
                        <ShortId value={failure.strategyId} />
                      </td>

                      <td>
                        <span className="failure-message" title={failure.failureMessage ?? ''}>
                          {failure.failureMessage || '-'}
                        </span>
                      </td>

                      <td>{formatDate(failure.createdAt)}</td>

                      <td className="table-action">
                        <button
                          type="button"
                          className="audit-button"
                          onClick={() => onAuditOpen(failure.analysisId)}
                        >
                          <FileSearch size={14} />
                          Audit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>

            <Pagination data={failures} onChange={onPageChange} />
          </>
        )}
      </section>
    </div>
  );
}

function PromptCreateDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [promptKey, setPromptKey] = useState<AiPromptKey>('STRATEGY_RISK_ANALYSIS');

  const [promptContent, setPromptContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = PROMPT_KEYS.find((item) => item.value === promptKey);

  const handleSubmit = async () => {
    if (!promptContent.trim()) {
      setError('프롬프트 내용을 입력해주세요.');
      return;
    }

    const confirmed = window.confirm(
      `${selected?.label ?? '선택한 프롬프트'}의 새 버전을 등록하시겠습니까?\n등록된 버전은 신규 분석에 사용될 수 있습니다.`
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError(null);

    const request: AiPromptVersionCreateRequest = {
      promptKey,
      promptContent: promptContent.trim(),
      changeSummary: changeSummary.trim() || undefined,
    };

    try {
      await createPromptVersion(request);
      onCreated();
    } catch {
      setError('새 프롬프트 버전을 등록하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer onClose={onClose}>
      <div className="drawer-header">
        <div>
          <span>AI PROMPT</span>
          <h2>새 프롬프트 버전 등록</h2>
          <p>새 분석부터 적용할 프롬프트 버전을 등록합니다.</p>
        </div>

        <CloseButton onClick={onClose} />
      </div>

      <div className="drawer-body prompt-form">
        <label className="form-field">
          <span>분석 유형</span>

          <select
            value={promptKey}
            onChange={(event) => setPromptKey(event.target.value as AiPromptKey)}
          >
            {PROMPT_KEYS.map((key) => (
              <option key={key.value} value={key.value}>
                {key.label}
              </option>
            ))}
          </select>

          <small>{selected?.description}</small>
        </label>

        <label className="form-field">
          <span>변경 내용</span>

          <input
            value={changeSummary}
            onChange={(event) => setChangeSummary(event.target.value)}
            placeholder="예: 위험 요인 응답 검증 기준 보강"
            maxLength={200}
          />
        </label>

        <label className="form-field form-field--prompt">
          <div className="form-field__label">
            <span>프롬프트</span>
            <small>{promptContent.length.toLocaleString()}자</small>
          </div>

          <textarea
            value={promptContent}
            onChange={(event) => setPromptContent(event.target.value)}
            placeholder="LLM 분석에 사용할 프롬프트를 입력하세요."
          />
        </label>

        <div className="prompt-notice">
          <AlertTriangle size={17} />

          <div>
            <strong>등록 전에 내용을 확인해주세요.</strong>
            <p>
              프롬프트 버전은 AI 분석 결과에 직접 영향을 줍니다. 분석 유형과 응답 형식, 검증 조건을
              확인한 뒤 등록하세요.
            </p>
          </div>
        </div>

        {error && <p className="drawer-form-error">{error}</p>}
      </div>

      <footer className="drawer-footer">
        <button type="button" className="secondary-button" onClick={onClose}>
          취소
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={submitting || !promptContent.trim()}
          onClick={() => void handleSubmit()}
        >
          {submitting ? '등록 중...' : '새 버전 등록'}
        </button>
      </footer>
    </Drawer>
  );
}

function AuditDrawer({
  audit,
  loading,
  error,
  onClose,
}: {
  audit: AiAuditDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <Drawer onClose={onClose}>
      <div className="drawer-header">
        <div>
          <span>ANALYSIS AUDIT</span>
          <h2>AI 분석 Audit</h2>
          <p>분석 요청부터 LLM 응답과 검증 결과까지 확인합니다.</p>
        </div>

        <CloseButton onClick={onClose} />
      </div>

      <div className="drawer-body">
        {loading && <LoadingState compact />}

        {error && (
          <div className="drawer-error">
            <AlertTriangle size={17} />
            {error}
          </div>
        )}

        {audit && (
          <>
            <AuditSection title="처리 결과">
              <div className="audit-summary">
                <AuditValue label="상태" value={audit.result?.status ?? '-'} />
                <AuditValue
                  label="실패 유형"
                  value={
                    audit.result?.failureType ? failureTypeLabel(audit.result.failureType) : '-'
                  }
                />
                <AuditValue label="모델" value={audit.metadata?.model ?? '-'} />
                <AuditValue
                  label="응답 시간"
                  value={audit.metadata ? `${audit.metadata.latencyMs.toLocaleString()}ms` : '-'}
                />
              </div>
            </AuditSection>

            {audit.validation && (
              <AuditSection title="응답 검증">
                <div className="validation-grid">
                  <ValidationResult label="구조 검증" valid={audit.validation.structureValid} />
                  <ValidationResult label="내용 검증" valid={audit.validation.contentValid} />
                </div>

                {audit.validation.errors.length > 0 && (
                  <div className="validation-errors">
                    {audit.validation.errors.map((item, index) => (
                      <p key={`${item}-${index}`}>{item}</p>
                    ))}
                  </div>
                )}
              </AuditSection>
            )}

            <AuditSection title="요청 Snapshot">
              <CodeBlock value={JSON.stringify(audit.requestSnapshot, null, 2)} />
            </AuditSection>

            {audit.prompt && (
              <AuditSection
                title="Prompt"
                meta={`${promptKeyLabel(audit.prompt.promptKey as AiPromptKey)} · ${audit.prompt.version}`}
              >
                <CodeBlock value={audit.prompt.content} />
              </AuditSection>
            )}

            {audit.response && (
              <AuditSection title="LLM Raw Response">
                <CodeBlock value={audit.response.rawResponse} />
              </AuditSection>
            )}

            <AuditSection title="식별 정보">
              <div className="audit-identifiers">
                <AuditValue label="분석 ID" value={audit.analysisId} />
                <AuditValue label="사용자 ID" value={audit.userId} />
                <AuditValue label="전략 ID" value={audit.strategyId} />
                <AuditValue label="백테스트 ID" value={audit.backtestId} />
              </div>
            </AuditSection>
          </>
        )}
      </div>
    </Drawer>
  );
}

function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="admin-drawer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="admin-drawer__panel">{children}</aside>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {count !== undefined && <span>{count.toLocaleString()}건</span>}
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={active ? 'is-active' : ''} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'success' | 'danger' | 'neutral';
  children: React.ReactNode;
}) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

function Metric({
  value,
  label,
  danger = false,
}: {
  value: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="prompt-metric">
      <strong className={danger ? 'is-danger' : ''}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Pagination<T>({
  data,
  onChange,
}: {
  data: PageResponse<T>;
  onChange: (page: number) => void;
}) {
  if (data.totalPages <= 1) return null;

  return (
    <div className="admin-pagination">
      <button type="button" disabled={data.first} onClick={() => onChange(data.page - 1)}>
        <ChevronLeft size={16} />
        이전
      </button>

      <span>
        <strong>{data.page + 1}</strong> / {data.totalPages}
      </span>

      <button type="button" disabled={data.last} onClick={() => onChange(data.page + 1)}>
        다음
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="admin-table-wrap">{children}</div>;
}

function ShortId({ value }: { value: string }) {
  return (
    <span className="short-id" title={value}>
      {value.slice(0, 8)}
    </span>
  );
}

function Muted() {
  return <span className="muted">-</span>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="admin-empty">{message}</div>;
}

function LoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`admin-loading ${compact ? 'admin-loading--compact' : ''}`}>
      <RefreshCw size={18} className="is-spinning" />
      운영 정보를 불러오는 중입니다.
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="drawer-close" aria-label="닫기" onClick={onClick}>
      <X size={20} />
    </button>
  );
}

function AuditSection({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="audit-section">
      <div className="audit-section__heading">
        <h3>{title}</h3>
        {meta && <span>{meta}</span>}
      </div>

      {children}
    </section>
  );
}

function AuditValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="audit-value">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function ValidationResult({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className={`validation-result ${valid ? 'is-valid' : 'is-invalid'}`}>
      <span>{label}</span>
      <strong>{valid ? '통과' : '실패'}</strong>
    </div>
  );
}

function CodeBlock({ value }: { value: string }) {
  return <pre className="audit-code">{value}</pre>;
}

function promptKeyLabel(key: AiPromptKey) {
  return PROMPT_KEYS.find((item) => item.value === key)?.label ?? key;
}

function failureTypeLabel(type: AiAnalysisFailureType) {
  return FAILURE_TYPES.find((item) => item.value === type)?.label ?? type;
}

function directionLabel(direction: string) {
  if (direction === 'BOTH') return '매수 · 매도';
  if (direction === 'BUY_ONLY') return '매수';
  if (direction === 'SELL_ONLY') return '매도';
  return direction;
}

function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: '요청',
    PROCESSING: '처리 중',
    ACCEPTED: '접수',
    PARTIALLY_FILLED: '부분 체결',
    FILLED: '체결 완료',
    CANCELED: '취소',
    FAILED: '실패',
    TIMEOUT: '확인 필요',
    PARTIALLY_FILLED_REJECTED: '부분 체결 후 거절',
  };

  return labels[status] ?? status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default AdminPage;
