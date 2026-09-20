import './AuthShowcase.scss';

type PhoneScreen = 'stock' | 'strategy' | 'backtest' | 'risk';

interface PhoneProps {
  variant: 'front' | 'back';
  screens: PhoneScreen[];
}

function StockScreen() {
  return (
    <div className="showcase-screen showcase-screen--stock">
      <div className="showcase-screen__header">
        <strong>4JO</strong>
        <span>종목 탐색</span>
      </div>

      <div className="showcase-stock__title">
        <div>
          <span>005930 · KOSPI</span>
          <h3>삼성전자</h3>
        </div>

        <span className="showcase-chip">KOSPI</span>
      </div>

      <div className="showcase-stock__price">
        <strong>260,000</strong>
        <span>원</span>
      </div>

      <p className="showcase-stock__change">+7,500 (+2.97%)</p>

      <div className="showcase-stock__chart">
        <svg viewBox="0 0 260 105" preserveAspectRatio="none">
          <path className="showcase-stock__grid" d="M0 26H260 M0 52H260 M0 78H260" />

          <path
            className="showcase-stock__line"
            d="
              M0 82
              C18 77, 29 88, 43 72
              S70 50, 87 63
              S111 75, 129 53
              S155 34, 174 47
              S200 65, 218 40
              S242 25, 260 17
            "
          />
        </svg>
      </div>

      <div className="showcase-stock__stats">
        <div>
          <span>PER</span>
          <strong>39.69</strong>
        </div>

        <div>
          <span>PBR</span>
          <strong>4.07</strong>
        </div>

        <div>
          <span>ROE</span>
          <strong>31.39%</strong>
        </div>
      </div>
    </div>
  );
}

function StrategyScreen() {
  return (
    <div className="showcase-screen showcase-screen--strategy">
      <div className="showcase-screen__header">
        <strong>4JO</strong>
        <span>내 전략</span>
      </div>

      <div className="showcase-section-title">
        <span>삼성전자</span>
        <h3>나의 투자 전략</h3>
      </div>

      <div className="showcase-strategy__status">
        <span className="showcase-status-dot" />
        전략 설정 중
      </div>

      <div className="showcase-strategy__list">
        <div>
          <span>매수 기준가</span>
          <strong>255,000원</strong>
        </div>

        <div>
          <span>매도 기준가</span>
          <strong>270,000원</strong>
        </div>

        <div>
          <span>목표 수익률</span>
          <strong>5.0%</strong>
        </div>

        <div>
          <span>손절률</span>
          <strong>-3.0%</strong>
        </div>
      </div>

      <div className="showcase-strategy__amount">
        <span>전략 배정 금액</span>
        <strong>3,000,000원</strong>

        <div>
          <i />
        </div>
      </div>
    </div>
  );
}

function BacktestScreen() {
  return (
    <div className="showcase-screen showcase-screen--backtest">
      <div className="showcase-screen__header">
        <strong>4JO</strong>
        <span>백테스트</span>
      </div>

      <div className="showcase-section-title showcase-section-title--row">
        <div>
          <span>전략 검증 결과</span>
          <h3>백테스트 완료</h3>
        </div>

        <span className="showcase-chip showcase-chip--green">완료</span>
      </div>

      <div className="showcase-backtest__return">
        <span>총 수익률</span>
        <strong>+8.24%</strong>
      </div>

      <div className="showcase-backtest__metrics">
        <div>
          <span>MDD</span>
          <strong>-3.12%</strong>
        </div>

        <div>
          <span>승률</span>
          <strong>62.5%</strong>
        </div>

        <div>
          <span>거래</span>
          <strong>16회</strong>
        </div>
      </div>

      <div className="showcase-backtest__bars">
        {[34, 47, 40, 59, 53, 70, 64, 83, 75, 94].map((height, index) => (
          <span key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

function RiskScreen() {
  return (
    <div className="showcase-screen showcase-screen--risk">
      <div className="showcase-screen__header">
        <strong>4JO</strong>
        <span>AI 위험 분석</span>
      </div>

      <div className="showcase-section-title showcase-section-title--row">
        <div>
          <span>전략 위험 분석</span>
          <h3>분석 완료</h3>
        </div>

        <span className="showcase-chip showcase-chip--green">완료</span>
      </div>

      <div className="showcase-risk__level">
        <span>위험 등급</span>
        <strong>MEDIUM</strong>

        <p>
          수익성과 변동성을 함께 고려한
          <br />
          전략 위험도입니다.
        </p>
      </div>

      <div className="showcase-risk__factors">
        <span>주요 위험 요인</span>

        <div>
          <i />
          시장 변동성
        </div>

        <div>
          <i />
          손실 가능 구간
        </div>

        <div>
          <i />
          전략 집중도
        </div>
      </div>
    </div>
  );
}

function Screen({ type }: { type: PhoneScreen }) {
  switch (type) {
    case 'stock':
      return <StockScreen />;

    case 'strategy':
      return <StrategyScreen />;

    case 'backtest':
      return <BacktestScreen />;

    case 'risk':
      return <RiskScreen />;
  }
}

function Phone({ variant, screens }: PhoneProps) {
  return (
    <div className={`auth-showcase__phone auth-showcase__phone--${variant}`}>
      <div className="auth-showcase__side-button auth-showcase__side-button--left" />

      <div className="auth-showcase__side-button auth-showcase__side-button--right" />

      <div className="auth-showcase__display">
        <div className="auth-showcase__speaker">
          <span />
        </div>

        <div className="auth-showcase__phone-viewport">
          <div className={`auth-showcase__screen-track auth-showcase__screen-track--${variant}`}>
            {screens.map((screen, index) => (
              <div key={`${variant}-${screen}-${index}`} className="auth-showcase__phone-screen">
                <Screen type={screen} />
              </div>
            ))}
          </div>
        </div>

        <div className="auth-showcase__home" />
      </div>
    </div>
  );
}

function AuthShowcase() {
  return (
    <div className="auth-showcase" aria-hidden="true">
      <div className="auth-showcase__stage">
        <Phone variant="back" screens={['strategy', 'backtest', 'risk', 'stock']} />

        <Phone variant="front" screens={['stock', 'strategy', 'backtest', 'risk']} />
      </div>

      <div className="auth-showcase__progress">
        <span>01</span>

        <div>
          <i />
        </div>

        <span>04</span>
      </div>
    </div>
  );
}

export default AuthShowcase;
