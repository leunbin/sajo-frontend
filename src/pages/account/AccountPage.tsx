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

import type {
  Account,
  AccountCreateRequest,
  AccountDeposit,
  AccountHolding,
  AccountHoldings,
  AccountType,
} from '../../types/account';

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
   * 최초 페이지 진입 시 계좌 연결 여부를 조회한다.
   *
   * isLoading의 초기값이 true이므로
   * useEffect 경로에서 다시 setIsLoading(true)를 호출하지 않는다.
   */
  const loadPage = useCallback(async () => {
    try {
      const accountResponse = await getMyAccount();

      setAccount(accountResponse);

      if (!accountResponse) {
        setDeposit(null);
        setHoldings([]);
        setHoldingsAsOf(null);
        setHoldingsCursor({
          hasNext: false,
          fk100: null,
          nk100: null,
        });

        return;
      }

      await loadAssets();
    } catch (error) {
      setPageError(getErrorMessage(error, '계좌 정보를 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [loadAssets]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadPage]);

  /**
   * 페이지 자체 조회 실패 후 사용자가 누르는 재시도.
   *
   * 사용자 액션이므로 여기서는 loading state를 직접 변경한다.
   */
  const handleRetryPage = async () => {
    setIsLoading(true);
    setPageError('');
    setAssetError('');

    await loadPage();
  };

  /**
   * 연결된 계좌의 자산 데이터만 다시 조회한다.
   */
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

  /**
   * 자산 영역에서 오류가 발생했을 때 다시 조회한다.
   */
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

      await loadAssets();
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
