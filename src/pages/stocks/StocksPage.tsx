import axios from 'axios';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStocks, searchStocks } from '../../api/market';
import type { MarketStock } from '../../types/market';
import './StocksPage.scss';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function StocksPage() {
  const navigate = useNavigate();

  const [stocks, setStocks] = useState<MarketStock[]>([]);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setDebouncedKeyword(keyword.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [keyword]);

  useEffect(() => {
    let ignore = false;

    const fetchStocks = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = debouncedKeyword
          ? await searchStocks(debouncedKeyword, page, PAGE_SIZE)
          : await getStocks(page, PAGE_SIZE);

        if (ignore) {
          return;
        }

        setStocks((previousStocks) =>
          page === 0 ? response.content : [...previousStocks, ...response.content]
        );

        setTotalElements(response.totalElements);
        setHasNextPage(page + 1 < response.totalPages);
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

    fetchStocks();

    return () => {
      ignore = true;
    };
  }, [page, debouncedKeyword]);

  useEffect(() => {
    const target = observerTarget.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isLoading) {
          setPage((previousPage) => previousPage + 1);
        }
      },
      {
        rootMargin: '200px',
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isLoading]);

  const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value);
  };

  const handleStockClick = (stockCode: string) => {
    navigate(`/stocks/${stockCode}`);
  };

  return (
    <section className="stocks-page">
      <header className="stocks-page__header">
        <h1>종목 탐색</h1>
        <p>국내 주식 종목을 검색하고 정보를 확인하세요.</p>
      </header>

      <div className="stocks-page__search-sticky">
        <div className="stocks-page__search">
          <Search size={20} aria-hidden="true" />

          <input
            type="search"
            value={keyword}
            onChange={handleKeywordChange}
            placeholder="종목명 또는 종목코드"
            aria-label="종목 검색"
          />
        </div>
      </div>

      <div className="stocks-page__list-header">
        <h2>{debouncedKeyword ? '검색 결과' : '전체 종목'}</h2>

        {!isLoading || stocks.length > 0 ? <span>{totalElements.toLocaleString()}개</span> : null}
      </div>

      {errorMessage && stocks.length === 0 ? (
        <div className="stocks-page__state">
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {!errorMessage && !isLoading && stocks.length === 0 ? (
        <div className="stocks-page__state">
          <p>일치하는 종목이 없습니다.</p>
          <span>종목명이나 종목코드를 다시 확인해주세요.</span>
        </div>
      ) : null}

      {stocks.length > 0 ? (
        <div className="stocks-page__list">
          <div className="stocks-page__columns">
            <span>종목</span>
            <span>시장</span>
            <span>시가총액</span>
          </div>

          {stocks.map((stock) => (
            <button
              type="button"
              className="stocks-page__row"
              key={stock.stockCode}
              onClick={() => handleStockClick(stock.stockCode)}
            >
              <span className="stocks-page__stock">
                <strong>{stock.stockName}</strong>

                <small className="stocks-page__stock-code">{stock.stockCode}</small>

                <small className="stocks-page__stock-mobile-meta">
                  {stock.stockCode} · {stock.marketType}
                </small>
              </span>

              <span className="stocks-page__market">{stock.marketType}</span>

              <span className="stocks-page__market-cap">{formatMarketCap(stock.marketCap)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? <div className="stocks-page__loading">종목을 불러오는 중입니다.</div> : null}

      <div ref={observerTarget} className="stocks-page__observer" aria-hidden="true" />
    </section>
  );
}

const formatMarketCap = (marketCap: number | null): string => {
  if (marketCap === null) {
    return '-';
  }

  const trillion = Math.floor(marketCap / 1_000_000_000_000);

  const billion = Math.floor((marketCap % 1_000_000_000_000) / 100_000_000);

  if (trillion > 0) {
    return billion > 0 ? `${trillion}조 ${billion.toLocaleString()}억` : `${trillion}조`;
  }

  return `${Math.floor(marketCap / 100_000_000).toLocaleString()}억`;
};

export default StocksPage;
