import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';

import { getStockChart, getStockSummary } from '../../api/market';
import type { StockPrice, StockSummary } from '../../types/market';
import './StockDetailPage.scss';

const CHART_PERIODS = [
  { label: '1주', days: 7 },
  { label: '1개월', days: 30 },
  { label: '3개월', days: 90 },
] as const;

type ChartDays = (typeof CHART_PERIODS)[number]['days'];

interface CandleChartData extends StockPrice {
  priceRange: [number, number];
}

interface CandleShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CandleChartData;
}

interface CandleTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: CandleChartData;
  }>;
}

function formatChartDate(value: string): string {
  const [, month, day] = value.split('-');

  return `${Number(month)}/${Number(day)}`;
}

function formatFullChartDate(value: string): string {
  const [year, month, day] = value.split('-');

  return `${year}.${month}.${day}`;
}

function formatChartPrice(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

function CandleShape({ x = 0, y = 0, width = 0, height = 0, payload }: CandleShapeProps) {
  if (!payload) {
    return null;
  }

  const { openPrice, highPrice, lowPrice, closePrice } = payload;

  const priceRange = highPrice - lowPrice;

  const centerX = x + width / 2;

  const candleWidth = Math.max(Math.min(width * 0.55, 14), 3);

  const color = closePrice > openPrice ? '#e5484d' : closePrice < openPrice ? '#3182f6' : '#6b7280';

  if (priceRange === 0) {
    const centerY = y + height / 2;

    return (
      <line
        x1={centerX - candleWidth / 2}
        x2={centerX + candleWidth / 2}
        y1={centerY}
        y2={centerY}
        stroke={color}
        strokeWidth={2}
      />
    );
  }

  /*
   * Bar의 dataKey가 [lowPrice, highPrice]이므로
   * Recharts가 전달하는 y ~ y + height가
   * 해당 거래일의 고가 ~ 저가 영역이다.
   */
  const priceToY = (price: number) => y + ((highPrice - price) / priceRange) * height;

  const highY = y;
  const lowY = y + height;
  const openY = priceToY(openPrice);
  const closeY = priceToY(closePrice);

  const bodyX = centerX - candleWidth / 2;
  const bodyY = Math.min(openY, closeY);

  // 시가 === 종가인 경우에도 봉이 보이도록 최소 높이 보장
  const bodyHeight = Math.max(Math.abs(closeY - openY), 2);

  return (
    <g>
      <line x1={centerX} x2={centerX} y1={highY} y2={lowY} stroke={color} strokeWidth={1.5} />

      <rect x={bodyX} y={bodyY} width={candleWidth} height={bodyHeight} fill={color} rx={1} />
    </g>
  );
}

function CandleTooltip({ active, payload }: CandleTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const price = payload[0].payload;

  return (
    <div className="stock-detail__candle-tooltip">
      <strong>{formatFullChartDate(price.tradeDate)}</strong>

      <dl>
        <div>
          <dt>시가</dt>
          <dd>{formatChartPrice(price.openPrice)}</dd>
        </div>

        <div>
          <dt>고가</dt>
          <dd>{formatChartPrice(price.highPrice)}</dd>
        </div>

        <div>
          <dt>저가</dt>
          <dd>{formatChartPrice(price.lowPrice)}</dd>
        </div>

        <div>
          <dt>종가</dt>
          <dd>{formatChartPrice(price.closePrice)}</dd>
        </div>
      </dl>
    </div>
  );
}

function StockDetailPage() {
  const navigate = useNavigate();
  const { stockCode } = useParams<{ stockCode: string }>();

  const [summary, setSummary] = useState<StockSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [chartDays, setChartDays] = useState<ChartDays>(30);

  const [chartData, setChartData] = useState<StockPrice[]>([]);

  const [isChartLoading, setIsChartLoading] = useState(true);

  const [chartError, setChartError] = useState('');

  useEffect(() => {
    if (!stockCode) {
      return;
    }

    let ignore = false;

    const fetchSummary = async () => {
      try {
        const response = await getStockSummary(stockCode);

        if (!ignore) {
          setSummary(response);
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (axios.isAxiosError(error)) {
          setErrorMessage(error.response?.data?.message ?? '종목 정보를 불러오지 못했습니다.');
        } else {
          setErrorMessage('종목 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void fetchSummary();

    return () => {
      ignore = true;
    };
  }, [stockCode]);

  useEffect(() => {
    if (!stockCode) {
      return;
    }

    let ignore = false;

    const fetchChart = async () => {
      setIsChartLoading(true);
      setChartError('');

      try {
        const data = await getStockChart(stockCode, chartDays);

        if (!ignore) {
          setChartData(data);
        }
      } catch {
        if (!ignore) {
          setChartData([]);
          setChartError('가격 추이를 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) {
          setIsChartLoading(false);
        }
      }
    };

    void fetchChart();

    return () => {
      ignore = true;
    };
  }, [stockCode, chartDays]);

  const sortedChartData = useMemo(
    () =>
      [...chartData].sort(
        (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
      ),
    [chartData]
  );

  const candleChartData = useMemo<CandleChartData[]>(
    () =>
      sortedChartData.map((price) => ({
        ...price,
        priceRange: [price.lowPrice, price.highPrice],
      })),
    [sortedChartData]
  );

  const chartDomain = useMemo<[number, number]>(() => {
    if (sortedChartData.length === 0) {
      return [0, 0];
    }

    const lowestPrice = Math.min(...sortedChartData.map((price) => price.lowPrice));

    const highestPrice = Math.max(...sortedChartData.map((price) => price.highPrice));

    const padding = Math.max((highestPrice - lowestPrice) * 0.08, 1);

    return [Math.floor(lowestPrice - padding), Math.ceil(highestPrice + padding)];
  }, [sortedChartData]);

  if (isLoading) {
    return (
      <section className="stock-detail">
        <div className="stock-detail__state">종목 정보를 불러오는 중입니다.</div>
      </section>
    );
  }

  if (errorMessage || !summary) {
    return (
      <section className="stock-detail">
        <button type="button" className="stock-detail__back" onClick={() => navigate('/stocks')}>
          <ArrowLeft size={18} />
          종목 탐색
        </button>

        <div className="stock-detail__state">{errorMessage || '종목 정보를 찾을 수 없습니다.'}</div>
      </section>
    );
  }

  const { stock, quote, indicator } = summary;

  return (
    <section className="stock-detail">
      <button type="button" className="stock-detail__back" onClick={() => navigate('/stocks')}>
        <ArrowLeft size={18} />
        종목 탐색
      </button>

      <header className="stock-detail__header">
        <div>
          <h1>{stock.stockName}</h1>

          <p>
            {stock.stockCode} · {stock.marketType}
          </p>
        </div>
      </header>

      <section className="stock-detail__quote">
        <span className="stock-detail__label">현재가</span>

        <strong>{formatPrice(quote.currentPrice)}</strong>

        <div className={getChangeClassName(quote.changePrice)}>
          <span>{formatChangePrice(quote.changePrice)}</span>

          <span>{formatChangeRate(quote.changeRate)}</span>
        </div>
      </section>

      <section className="stock-detail__section">
        <div className="stock-detail__section-header">
          <h2>투자 지표</h2>

          {indicator?.financialReferenceYearMonth && (
            <span>재무 기준 {formatReferenceMonth(indicator.financialReferenceYearMonth)}</span>
          )}
        </div>

        <div className="stock-detail__metrics">
          <div>
            <span>PER</span>
            <strong>{formatMultiple(indicator?.per)}</strong>
          </div>

          <div>
            <span>PBR</span>
            <strong>{formatMultiple(indicator?.pbr)}</strong>
          </div>

          <div>
            <span>ROE</span>
            <strong>{formatPercent(indicator?.roe)}</strong>
          </div>
        </div>
      </section>

      <section className="stock-detail__section stock-detail__chart-section">
        <div className="stock-detail__section-header">
          <h2>가격 추이</h2>

          <div className="stock-detail__periods" role="group" aria-label="가격 조회 기간">
            {CHART_PERIODS.map((period) => (
              <button
                key={period.days}
                type="button"
                className={
                  chartDays === period.days
                    ? 'stock-detail__period stock-detail__period--active'
                    : 'stock-detail__period'
                }
                onClick={() => setChartDays(period.days)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stock-detail__chart">
          {isChartLoading ? (
            <div className="stock-detail__chart-state">가격 정보를 불러오는 중입니다.</div>
          ) : chartError ? (
            <div className="stock-detail__chart-state stock-detail__chart-state--error">
              {chartError}
            </div>
          ) : candleChartData.length === 0 ? (
            <div className="stock-detail__chart-state">조회할 가격 정보가 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={candleChartData}
                margin={{
                  top: 16,
                  right: 8,
                  bottom: 4,
                  left: 8,
                }}
                barCategoryGap="25%"
              >
                <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />

                <XAxis
                  dataKey="tradeDate"
                  tickFormatter={formatChartDate}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={32}
                  tick={{
                    fill: '#6b7280',
                    fontSize: 12,
                  }}
                />

                <YAxis
                  domain={chartDomain}
                  tickFormatter={(value: number) => value.toLocaleString('ko-KR')}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                  tick={{
                    fill: '#6b7280',
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: 'rgba(17, 24, 39, 0.03)',
                  }}
                  content={<CandleTooltip />}
                />

                <Bar dataKey="priceRange" shape={<CandleShape />} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="stock-detail__strategy">
        <div>
          <h2>이 종목으로 투자 전략을 만들어보세요.</h2>

          <p>매수·매도 가격과 투자 지표 조건을 직접 설정할 수 있습니다.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/strategies/new?stockCode=${stock.stockCode}`)}
        >
          전략 만들기
        </button>
      </section>
    </section>
  );
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `${value.toLocaleString('ko-KR')}원`;
}

function formatChangePrice(value: number | null): string {
  if (value === null) {
    return '-';
  }

  if (value > 0) {
    return `+${value.toLocaleString('ko-KR')}원`;
  }

  return `${value.toLocaleString('ko-KR')}원`;
}

function formatChangeRate(value: number | null): string {
  if (value === null) {
    return '';
  }

  const prefix = value > 0 ? '+' : '';

  return `${prefix}${value.toFixed(2)}%`;
}

function formatMultiple(value: number | null | undefined): string {
  if (value == null) {
    return '-';
  }

  return `${value.toFixed(2)}배`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) {
    return '-';
  }

  return `${value.toFixed(2)}%`;
}

function formatReferenceMonth(value: string): string {
  if (value.length !== 6) {
    return value;
  }

  return `${value.slice(0, 4)}.${value.slice(4)}`;
}

function getChangeClassName(changePrice: number | null): string {
  if (changePrice === null || changePrice === 0) {
    return 'stock-detail__change';
  }

  return changePrice > 0
    ? 'stock-detail__change stock-detail__change--rise'
    : 'stock-detail__change stock-detail__change--fall';
}

export default StockDetailPage;
