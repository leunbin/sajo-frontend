import axios from 'axios';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Landmark,
  Link2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Unlink,
  WalletCards,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createAccount,
  deleteAccount,
  getAccountDeposit,
  getAccountHoldings,
  getMyAccount,
} from '../../api/account';
import { createTradingLimit, getTradingLimit, updateTradingLimit } from '../../api/autoTrading';

import type {
  Account,
  AccountCreateRequest,
  AccountDeposit,
  AccountHolding,
  AccountHoldings,
  AccountType,
} from '../../types/account';
import type { TradingLimit } from '../../types/autoTrading';

import './AccountPage.scss';

const formatWon = (value: number) => `${value.toLocaleString('ko-KR')}원`;

const formatPrice = (value: number) => value.toLocaleString('ko-KR');

const formatRate = (value: number) => {
  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  return `${value.toFixed(2)}%`;
};

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

const isTradingLimitNotFoundError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const data = error.response?.data;

  return (
    data !== null &&
    typeof data === 'object' &&
    'errorCode' in data &&
    data.errorCode === 'AUTO_TRADING_0003'
  );
};

const AccountPage = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [deposit, setDeposit] = useState<AccountDeposit | null>(null);
  const [holdings, setHoldings] = useState<AccountHolding[]>([]);

  const [holdingsCursor, setHoldingsCursor] = useState<{
    hasNext: boolean;
    fk100: string | null;
    nk100: string | null;
  }>({
    hasNext: false,
    fk100: null,
    nk100: null,
  });

  const [holdingsAsOf, setHoldingsAsOf] = useState<string | null>(null);

  const [tradingLimit, setTradingLimit] = useState<TradingLimit | null>(null);
  const [isTradingLimitLoading, setIsTradingLimitLoading] = useState(false);
  const [isTradingLimitEditing, setIsTradingLimitEditing] = useState(false);
  const [isTradingLimitSaving, setIsTradingLimitSaving] = useState(false);
  const [tradingLimitError, setTradingLimitError] = useState('');
  const [tradingLimitSuccess, setTradingLimitSuccess] = useState('');

  const [dailyMaxOrderAmount, setDailyMaxOrderAmount] = useState('');
  const [dailyMaxOrderCount, setDailyMaxOrderCount] = useState('');
  const [dailyLossLimitRate, setDailyLossLimitRate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isAssetLoading, setIsAssetLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pageError, setPageError] = useState('');
  const [assetError, setAssetError] = useState('');
  const [formError, setFormError] = useState('');

  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [showAppKey, setShowAppKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [appKey, setAppKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('VIRTUAL');

  const syncTradingLimitForm = useCallback((limit: TradingLimit | null) => {
    if (!limit) {
      setDailyMaxOrderAmount('');
      setDailyMaxOrderCount('');
      setDailyLossLimitRate('');
      return;
    }

    setDailyMaxOrderAmount(String(limit.dailyMaxOrderAmount));
    setDailyMaxOrderCount(String(limit.dailyMaxOrderCount));
    setDailyLossLimitRate(String(limit.dailyLossLimitRate));
  }, []);

  /**
   * 계좌의 예수금 + 보유종목 데이터를 조회한다.
   *
   * 이 함수에서는 loading state를 직접 변경하지 않는다.
   * 최초 페이지 진입과 사용자의 새로고침 액션을 분리하기 위함이다.
   */
  const loadAssets = useCallback(async () => {
    try {
      const [depositResponse, holdingsResponse] = await Promise.all([
        getAccountDeposit(),
        getAccountHoldings(),
      ]);

      setDeposit(depositResponse);
      setHoldings(holdingsResponse.holdings);
      setHoldingsAsOf(holdingsResponse.asOf);

      setHoldingsCursor({
        hasNext: holdingsResponse.hasNext,
        fk100: holdingsResponse.nextCtxAreaFk100,
        nk100: holdingsResponse.nextCtxAreaNk100,
      });
    } catch (error) {
      setAssetError(getErrorMessage(error, '계좌 자산 정보를 불러오지 못했습니다.'));
    }
  }, []);

  /**
   * 사용자 공통 자동매매 한도를 조회한다.
   *
   * AUTO_TRADING_0003은 오류 화면을 보여줄 상황이 아니라
   * 아직 한도가 설정되지 않은 정상 상태로 처리한다.
   */
  const loadTradingLimit = useCallback(async () => {
    try {
      setIsTradingLimitLoading(true);
      setTradingLimitError('');

      const response = await getTradingLimit();

      setTradingLimit(response);
      syncTradingLimitForm(response);
      setIsTradingLimitEditing(false);
    } catch (error) {
      if (isTradingLimitNotFoundError(error)) {
        setTradingLimit(null);
        syncTradingLimitForm(null);
        setIsTradingLimitEditing(true);
        return;
      }

      setTradingLimitError(getErrorMessage(error, '자동매매 공통 한도를 불러오지 못했습니다.'));
    } finally {
      setIsTradingLimitLoading(false);
    }
  }, [syncTradingLimitForm]);

  /**
   * 최초 페이지 진입 시 계좌 연결 여부를 조회한다.
   */
  const loadPage = useCallback(async () => {
    try {
      const accountResponse = await getMyAccount();

      setAccount(accountResponse);

      if (!accountResponse) {
        setDeposit(null);
        setHoldings([]);
        setHoldingsAsOf(null);
        setTradingLimit(null);
        syncTradingLimitForm(null);

        setHoldingsCursor({
          hasNext: false,
          fk100: null,
          nk100: null,
        });

        return;
      }

      await Promise.all([loadAssets(), loadTradingLimit()]);
    } catch (error) {
      setPageError(getErrorMessage(error, '계좌 정보를 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [loadAssets, loadTradingLimit, syncTradingLimitForm]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadPage]);

  const handleRetryPage = async () => {
    setIsLoading(true);
    setPageError('');
    setAssetError('');

    await loadPage();
  };

  const handleRefresh = async () => {
    if (!account || isAssetLoading) {
      return;
    }

    try {
      setIsAssetLoading(true);
      setAssetError('');

      await loadAssets();
    } finally {
      setIsAssetLoading(false);
    }
  };

  const handleRetryAssets = async () => {
    if (!account || isAssetLoading) {
      return;
    }

    try {
      setIsAssetLoading(true);
      setAssetError('');

      await loadAssets();
    } finally {
      setIsAssetLoading(false);
    }
  };

  const handleAccountNoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 10);

    if (digits.length <= 8) {
      setAccountNo(digits);
      return;
    }

    setAccountNo(`${digits.slice(0, 8)}-${digits.slice(8)}`);
  };

  const handleConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isConnecting) {
      return;
    }

    const trimmedAppKey = appKey.trim();
    const trimmedSecretKey = secretKey.trim();
    const trimmedAccountNo = accountNo.trim();

    if (!trimmedAppKey) {
      setFormError('App Key를 입력해주세요.');
      return;
    }

    if (!trimmedSecretKey) {
      setFormError('Secret Key를 입력해주세요.');
      return;
    }

    if (!/^\d{8}-\d{2}$/.test(trimmedAccountNo)) {
      setFormError('계좌번호를 12345678-01 형식으로 입력해주세요.');
      return;
    }

    const request: AccountCreateRequest = {
      appKey: trimmedAppKey,
      secretKey: trimmedSecretKey,
      accountNo: trimmedAccountNo,
      accountType,
    };

    try {
      setIsConnecting(true);
      setFormError('');
      setAssetError('');

      const createdAccount = await createAccount(request);

      setAccount(createdAccount);

      setAppKey('');
      setSecretKey('');
      setAccountNo('');
      setShowAppKey(false);
      setShowSecretKey(false);
      setShowConnectionForm(false);

      await Promise.all([loadAssets(), loadTradingLimit()]);
    } catch (error) {
      setFormError(getErrorMessage(error, '계좌를 연결하지 못했습니다. 입력 정보를 확인해주세요.'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLoadMore = async () => {
    if (
      isMoreLoading ||
      !holdingsCursor.hasNext ||
      !holdingsCursor.fk100 ||
      !holdingsCursor.nk100
    ) {
      return;
    }

    try {
      setIsMoreLoading(true);
      setAssetError('');

      const response: AccountHoldings = await getAccountHoldings(
        holdingsCursor.fk100,
        holdingsCursor.nk100
      );

      setHoldings((previous) => [...previous, ...response.holdings]);

      setHoldingsAsOf(response.asOf);

      setHoldingsCursor({
        hasNext: response.hasNext,
        fk100: response.nextCtxAreaFk100,
        nk100: response.nextCtxAreaNk100,
      });
    } catch (error) {
      setAssetError(getErrorMessage(error, '보유 종목을 추가로 불러오지 못했습니다.'));
    } finally {
      setIsMoreLoading(false);
    }
  };

  const handleTradingLimitEdit = () => {
    syncTradingLimitForm(tradingLimit);
    setTradingLimitError('');
    setTradingLimitSuccess('');
    setIsTradingLimitEditing(true);
  };

  const handleTradingLimitCancel = () => {
    if (!tradingLimit) {
      return;
    }

    syncTradingLimitForm(tradingLimit);
    setTradingLimitError('');
    setTradingLimitSuccess('');
    setIsTradingLimitEditing(false);
  };

  const handleTradingLimitSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isTradingLimitSaving) {
      return;
    }

    const maxOrderAmount = Number(dailyMaxOrderAmount);
    const maxOrderCount = Number(dailyMaxOrderCount);
    const lossLimitRate = Number(dailyLossLimitRate);

    if (
      !Number.isFinite(maxOrderAmount) ||
      !Number.isInteger(maxOrderAmount) ||
      maxOrderAmount <= 0
    ) {
      setTradingLimitError('일 최대 주문 금액은 0보다 큰 정수로 입력해주세요.');
      return;
    }

    if (!Number.isFinite(maxOrderCount) || !Number.isInteger(maxOrderCount) || maxOrderCount <= 0) {
      setTradingLimitError('일 최대 주문 횟수는 0보다 큰 정수로 입력해주세요.');
      return;
    }

    if (!Number.isFinite(lossLimitRate) || lossLimitRate <= 0) {
      setTradingLimitError('일 손실 한도는 0보다 큰 값으로 입력해주세요.');
      return;
    }

    try {
      setIsTradingLimitSaving(true);
      setTradingLimitError('');
      setTradingLimitSuccess('');

      const request = {
        dailyMaxOrderAmount: maxOrderAmount,
        dailyMaxOrderCount: maxOrderCount,
        dailyLossLimitRate: lossLimitRate,
      };

      const savedLimit = tradingLimit
        ? await updateTradingLimit(request)
        : await createTradingLimit(request);

      setTradingLimit(savedLimit);
      syncTradingLimitForm(savedLimit);
      setIsTradingLimitEditing(false);
      setTradingLimitSuccess(
        tradingLimit ? '자동매매 공통 한도를 변경했습니다.' : '자동매매 공통 한도를 설정했습니다.'
      );
    } catch (error) {
      setTradingLimitError(getErrorMessage(error, '자동매매 공통 한도를 저장하지 못했습니다.'));
    } finally {
      setIsTradingLimitSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      '연결된 계좌를 해제하시겠습니까?\n활성 자동매매 또는 미체결 주문이 있으면 해제할 수 없습니다.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      setPageError('');

      await deleteAccount();

      setAccount(null);
      setDeposit(null);
      setHoldings([]);
      setHoldingsAsOf(null);
      setAssetError('');
      setTradingLimit(null);
      setTradingLimitError('');
      setTradingLimitSuccess('');
      setIsTradingLimitEditing(false);
      syncTradingLimitForm(null);

      setHoldingsCursor({
        hasNext: false,
        fk100: null,
        nk100: null,
      });

      setShowConnectionForm(false);
    } catch (error) {
      setPageError(getErrorMessage(error, '계좌 연결을 해제하지 못했습니다.'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="account-page">
        <div className="account-page__state">
          <LoaderCircle className="account-page__spinner" size={22} />
          <span>계좌 정보를 불러오는 중입니다.</span>
        </div>
      </main>
    );
  }

  if (pageError && !account) {
    return (
      <main className="account-page">
        <div className="account-page__state account-page__state--error">
          <AlertCircle size={22} />

          <strong>계좌 정보를 불러오지 못했습니다.</strong>

          <p>{pageError}</p>

          <button type="button" onClick={() => void handleRetryPage()}>
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="account-page">
        <header className="account-page__header">
          <div>
            <h1>내 계좌</h1>
            <p>한국투자증권 계좌를 연결하고 자산 현황을 확인합니다.</p>
          </div>
        </header>

        {!showConnectionForm ? (
          <section className="account-page__empty">
            <div className="account-page__empty-icon">
              <Landmark size={25} strokeWidth={1.8} />
            </div>

            <strong>연결된 계좌가 없습니다.</strong>

            <p>
              한국투자증권 계좌를 연결하면 보유 자산과 평가 손익을 확인하고 자동매매에 사용할 수
              있습니다.
            </p>

            <button
              type="button"
              className="account-page__primary-button"
              onClick={() => {
                setFormError('');
                setShowConnectionForm(true);
              }}
            >
              <Link2 size={16} />
              계좌 연결
            </button>
          </section>
        ) : (
          <section className="account-page__connect">
            <div className="account-page__section-header">
              <div>
                <h2>한국투자증권 계좌 연결</h2>
                <p>KIS Open API에서 발급받은 정보를 입력해주세요.</p>
              </div>
            </div>

            <form
              className="account-page__connect-form"
              onSubmit={(event) => void handleConnect(event)}
            >
              <div className="account-page__type-field">
                <span className="account-page__field-label">계좌 유형</span>

                <div className="account-page__type-options">
                  <label
                    className={`account-page__type-option ${
                      accountType === 'VIRTUAL' ? 'account-page__type-option--selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value="VIRTUAL"
                      checked={accountType === 'VIRTUAL'}
                      disabled={isConnecting}
                      onChange={() => setAccountType('VIRTUAL')}
                    />

                    <span className="account-page__radio">
                      <span />
                    </span>

                    <div>
                      <strong>모의투자</strong>
                      <small>KIS 모의투자 계좌를 연결합니다.</small>
                    </div>
                  </label>

                  <label
                    className={`account-page__type-option ${
                      accountType === 'REAL' ? 'account-page__type-option--selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value="REAL"
                      checked={accountType === 'REAL'}
                      disabled={isConnecting}
                      onChange={() => setAccountType('REAL')}
                    />

                    <span className="account-page__radio">
                      <span />
                    </span>

                    <div>
                      <strong>실전투자</strong>
                      <small>실제 투자 계좌를 연결합니다.</small>
                    </div>
                  </label>
                </div>
              </div>

              {accountType === 'REAL' && (
                <div className="account-page__real-warning">
                  <AlertCircle size={17} />

                  <p>
                    실전투자 계좌는 실제 자산과 연결됩니다. 계좌 유형과 API 정보를 다시
                    확인해주세요.
                  </p>
                </div>
              )}

              <label className="account-page__field">
                <span>계좌번호</span>

                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="12345678-01"
                  value={accountNo}
                  disabled={isConnecting}
                  onChange={handleAccountNoChange}
                />

                <small>숫자 8자리와 상품코드 2자리를 입력해주세요.</small>
              </label>

              <label className="account-page__field">
                <span>App Key</span>

                <div className="account-page__secret-input">
                  <input
                    type={showAppKey ? 'text' : 'password'}
                    autoComplete="off"
                    placeholder="KIS App Key"
                    value={appKey}
                    disabled={isConnecting}
                    onChange={(event) => setAppKey(event.target.value)}
                  />

                  <button
                    type="button"
                    aria-label={showAppKey ? 'App Key 숨기기' : 'App Key 보기'}
                    disabled={isConnecting}
                    onClick={() => setShowAppKey((previous) => !previous)}
                  >
                    {showAppKey ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <label className="account-page__field">
                <span>Secret Key</span>

                <div className="account-page__secret-input">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    autoComplete="off"
                    placeholder="KIS Secret Key"
                    value={secretKey}
                    disabled={isConnecting}
                    onChange={(event) => setSecretKey(event.target.value)}
                  />

                  <button
                    type="button"
                    aria-label={showSecretKey ? 'Secret Key 숨기기' : 'Secret Key 보기'}
                    disabled={isConnecting}
                    onClick={() => setShowSecretKey((previous) => !previous)}
                  >
                    {showSecretKey ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <div className="account-page__security-note">
                <ShieldCheck size={17} />

                <p>
                  입력한 API 인증 정보는 계좌 연결과 KIS API 요청에 사용되며, 연결 후 화면에 다시
                  표시되지 않습니다.
                </p>
              </div>

              {formError && <p className="account-page__form-error">{formError}</p>}

              <div className="account-page__form-actions">
                <button
                  type="button"
                  className="account-page__secondary-button"
                  disabled={isConnecting}
                  onClick={() => {
                    setShowConnectionForm(false);
                    setFormError('');
                  }}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="account-page__primary-button"
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <LoaderCircle className="account-page__spinner" size={16} />
                      연결 중
                    </>
                  ) : (
                    <>
                      <Link2 size={16} />
                      계좌 연결
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="account-page">
      <header className="account-page__header">
        <div>
          <h1>내 계좌</h1>
          <p>연결된 계좌의 자산과 보유 종목을 확인합니다.</p>
        </div>

        <button
          type="button"
          className="account-page__refresh"
          aria-label="계좌 정보 새로고침"
          title="새로고침"
          disabled={isAssetLoading}
          onClick={() => void handleRefresh()}
        >
          <RefreshCw className={isAssetLoading ? 'account-page__spinner' : undefined} size={16} />

          <span>새로고침</span>
        </button>
      </header>

      <section className="account-page__section">
        <div className="account-page__section-header">
          <div>
            <h2>자산 현황</h2>

            {deposit?.asOf && <p>{formatDateTime(deposit.asOf)} 기준</p>}
          </div>
        </div>

        {isAssetLoading && !deposit ? (
          <div className="account-page__asset-loading">
            <LoaderCircle className="account-page__spinner" size={20} />
            <span>자산 정보를 불러오는 중입니다.</span>
          </div>
        ) : deposit ? (
          <>
            <div className="account-page__asset-main">
              <span>총 평가금액</span>
              <strong>{formatWon(deposit.totalEvaluationAmount)}</strong>
            </div>

            <div className="account-page__asset-grid">
              <div className="account-page__asset-value">
                <span>평가손익</span>

                <strong
                  className={
                    deposit.totalProfitLoss > 0
                      ? 'account-page__number--rise'
                      : deposit.totalProfitLoss < 0
                        ? 'account-page__number--fall'
                        : undefined
                  }
                >
                  {formatProfitLoss(deposit.totalProfitLoss)}
                </strong>
              </div>

              <div className="account-page__asset-value">
                <span>예수금</span>
                <strong>{formatWon(deposit.depositTotal)}</strong>
              </div>

              <div className="account-page__asset-value">
                <span>순자산</span>
                <strong>{formatWon(deposit.netAssetAmount)}</strong>
              </div>

              <div className="account-page__asset-value">
                <span>D+2 예수금</span>
                <strong>{formatWon(deposit.d2Deposit)}</strong>
              </div>
            </div>
          </>
        ) : (
          <div className="account-page__asset-unavailable">자산 정보를 확인할 수 없습니다.</div>
        )}

        {assetError && (
          <div className="account-page__asset-error">
            <AlertCircle size={16} />

            <span>{assetError}</span>

            <button
              type="button"
              disabled={isAssetLoading}
              onClick={() => void handleRetryAssets()}
            >
              다시 시도
            </button>
          </div>
        )}
      </section>

      <section className="account-page__section">
        <div className="account-page__section-header">
          <div>
            <h2>보유 종목</h2>

            {holdingsAsOf && (
              <p>
                {formatDateTime(holdingsAsOf)} 기준 · {holdings.length}종목
              </p>
            )}
          </div>
        </div>

        {!isAssetLoading && holdings.length === 0 ? (
          <div className="account-page__holdings-empty">
            <WalletCards size={22} />

            <strong>보유 중인 종목이 없습니다.</strong>

            <p>계좌에 주식을 보유하면 이곳에서 평가 현황을 확인할 수 있습니다.</p>
          </div>
        ) : (
          <>
            <div className="account-page__holdings-table">
              <div className="account-page__holding-head">
                <span>종목</span>
                <span>보유수량</span>
                <span>평균 매입가</span>
                <span>현재가</span>
                <span>평가금액</span>
                <span>평가손익</span>
              </div>

              {holdings.map((holding) => (
                <button
                  key={holding.stockCode}
                  type="button"
                  className="account-page__holding-row"
                  onClick={() => navigate(`/stocks/${holding.stockCode}`)}
                >
                  <span className="account-page__holding-stock">
                    <strong>{holding.stockName}</strong>
                    <small>{holding.stockCode}</small>
                  </span>

                  <span>
                    {holding.quantity.toLocaleString('ko-KR')}주
                    <small>매도 가능 {holding.sellableQuantity.toLocaleString('ko-KR')}주</small>
                  </span>

                  <span>{formatPrice(holding.avgPurchasePrice)}원</span>

                  <span>{formatWon(holding.currentPrice)}</span>

                  <span>{formatWon(holding.evaluationAmount)}</span>

                  <span
                    className={
                      holding.profitLossAmount > 0
                        ? 'account-page__number--rise'
                        : holding.profitLossAmount < 0
                          ? 'account-page__number--fall'
                          : undefined
                    }
                  >
                    <strong>{formatProfitLoss(holding.profitLossAmount)}</strong>

                    <small>{formatRate(holding.profitLossRate)}</small>
                  </span>

                  <ChevronRight className="account-page__holding-arrow" size={16} />
                </button>
              ))}
            </div>

            {holdingsCursor.hasNext && (
              <div className="account-page__more">
                <button
                  type="button"
                  disabled={isMoreLoading}
                  onClick={() => void handleLoadMore()}
                >
                  {isMoreLoading ? (
                    <>
                      <LoaderCircle className="account-page__spinner" size={15} />
                      불러오는 중
                    </>
                  ) : (
                    '보유 종목 더보기'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="account-page__section">
        <div className="account-page__section-header account-page__limit-header">
          <div>
            <h2>자동매매 공통 한도</h2>
            <p>모든 자동매매 전략에 공통으로 적용되는 주문 한도입니다.</p>
          </div>

          {tradingLimit && !isTradingLimitEditing && (
            <span className="account-page__limit-status">
              <Check size={12} />
              설정됨
            </span>
          )}
        </div>

        {isTradingLimitLoading ? (
          <div className="account-page__limit-loading">
            <LoaderCircle className="account-page__spinner" size={18} />
            <span>공통 한도를 불러오는 중입니다.</span>
          </div>
        ) : isTradingLimitEditing || !tradingLimit ? (
          <form
            className="account-page__limit-form"
            onSubmit={(event) => void handleTradingLimitSubmit(event)}
          >
            {!tradingLimit && (
              <div className="account-page__limit-guide">
                <strong>자동매매를 시작하기 전에 공통 한도를 설정해주세요.</strong>
                <p>
                  설정한 한도는 개별 전략이 아닌 계정의 모든 자동매매 전략에 동일하게 적용됩니다.
                </p>
              </div>
            )}

            <div className="account-page__limit-fields">
              <label>
                <span>일 최대 주문 금액</span>

                <div className="account-page__limit-input">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder="5000000"
                    value={dailyMaxOrderAmount}
                    disabled={isTradingLimitSaving}
                    onChange={(event) => setDailyMaxOrderAmount(event.target.value)}
                  />
                  <span>원</span>
                </div>
              </label>

              <label>
                <span>일 최대 주문 횟수</span>

                <div className="account-page__limit-input">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder="10"
                    value={dailyMaxOrderCount}
                    disabled={isTradingLimitSaving}
                    onChange={(event) => setDailyMaxOrderCount(event.target.value)}
                  />
                  <span>회</span>
                </div>
              </label>

              <label>
                <span>일 손실 한도</span>

                <div className="account-page__limit-input">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="5"
                    value={dailyLossLimitRate}
                    disabled={isTradingLimitSaving}
                    onChange={(event) => setDailyLossLimitRate(event.target.value)}
                  />
                  <span>%</span>
                </div>
              </label>
            </div>

            {tradingLimitError && (
              <div className="account-page__limit-message account-page__limit-message--error">
                <AlertCircle size={15} />
                <span>{tradingLimitError}</span>
              </div>
            )}

            <div className="account-page__limit-actions">
              <span>주문 실행 전 공통 한도를 기준으로 주문 가능 여부를 확인합니다.</span>

              <div>
                {tradingLimit && (
                  <button
                    type="button"
                    className="account-page__secondary-button"
                    disabled={isTradingLimitSaving}
                    onClick={handleTradingLimitCancel}
                  >
                    취소
                  </button>
                )}

                <button
                  type="submit"
                  className="account-page__primary-button"
                  disabled={isTradingLimitSaving}
                >
                  {isTradingLimitSaving ? (
                    <>
                      <LoaderCircle className="account-page__spinner" size={15} />
                      저장 중
                    </>
                  ) : tradingLimit ? (
                    '변경사항 저장'
                  ) : (
                    '한도 설정'
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="account-page__limit-summary">
            <div className="account-page__limit-values">
              <div>
                <span>일 최대 주문 금액</span>
                <strong>{tradingLimit.dailyMaxOrderAmount.toLocaleString('ko-KR')}원</strong>
              </div>

              <div>
                <span>일 최대 주문 횟수</span>
                <strong>{tradingLimit.dailyMaxOrderCount.toLocaleString('ko-KR')}회</strong>
              </div>

              <div>
                <span>일 손실 한도</span>
                <strong>{tradingLimit.dailyLossLimitRate}%</strong>
              </div>
            </div>

            <div className="account-page__limit-summary-footer">
              <span>자동매매 전략의 주문은 이 한도 내에서 실행됩니다.</span>

              <button
                type="button"
                className="account-page__secondary-button"
                onClick={handleTradingLimitEdit}
              >
                한도 변경
              </button>
            </div>
          </div>
        )}

        {!isTradingLimitEditing && tradingLimitError && (
          <div className="account-page__limit-message account-page__limit-message--error">
            <AlertCircle size={15} />
            <span>{tradingLimitError}</span>

            <button
              type="button"
              disabled={isTradingLimitLoading}
              onClick={() => void loadTradingLimit()}
            >
              다시 시도
            </button>
          </div>
        )}

        {tradingLimitSuccess && !isTradingLimitEditing && (
          <div className="account-page__limit-message account-page__limit-message--success">
            <Check size={15} />
            <span>{tradingLimitSuccess}</span>
          </div>
        )}
      </section>

      <section className="account-page__section account-page__connection">
        <div className="account-page__section-header">
          <div>
            <h2>연결 계좌</h2>
            <p>자동매매와 자산 조회에 사용되는 계좌입니다.</p>
          </div>
        </div>

        <div className="account-page__connection-row">
          <div className="account-page__connection-icon">
            <Check size={16} />
          </div>

          <div className="account-page__connection-info">
            <strong>
              한국투자증권 {account.accountType === 'VIRTUAL' ? '모의투자' : '실전투자'}
            </strong>

            <span>{account.accountNo}</span>
          </div>

          <span
            className={`account-page__account-type account-page__account-type--${account.accountType.toLowerCase()}`}
          >
            {account.accountType === 'VIRTUAL' ? '모의' : '실전'}
          </span>
        </div>

        {pageError && <p className="account-page__disconnect-error">{pageError}</p>}

        <div className="account-page__disconnect">
          <div>
            <strong>계좌 연결 해제</strong>
            <p>활성 자동매매 또는 미체결 주문이 있는 경우 계좌를 해제할 수 없습니다.</p>
          </div>

          <button type="button" disabled={isDeleting} onClick={() => void handleDisconnect()}>
            {isDeleting ? (
              <>
                <LoaderCircle className="account-page__spinner" size={15} />
                해제 중
              </>
            ) : (
              <>
                <Unlink size={15} />
                연결 해제
              </>
            )}
          </button>
        </div>
      </section>
    </main>
  );
};

export default AccountPage;
