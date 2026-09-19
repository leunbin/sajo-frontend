import { AlertCircle, ChevronRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAiRiskAnalysisHistory } from '../../api/aiRisk';
import type { AiRiskAnalysisHistoryItem } from '../../types/aiRisk';
import './AnalysisHistoryPage.scss';

const PAGE_SIZE = 10;

type HistoryTab = 'BACKTEST' | 'AI';

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getStatusLabel = (status: AiRiskAnalysisHistoryItem['status']) => {
  switch (status) {
    case 'PENDING':
      return '분석 중';
    case 'COMPLETED':
      return '분석 완료';
    case 'FAILED':
      return '분석 실패';
    default:
      return status;
  }
};

const getRiskLabel = (riskLevel: AiRiskAnalysisHistoryItem['riskLevel']) => {
  switch (riskLevel) {
    case 'LOW':
      return '낮음';
    case 'MEDIUM':
      return '보통';
    case 'HIGH':
      return '높음';
    default:
      return null;
  }
};

function AnalysisHistoryPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<HistoryTab>('AI');
  const [histories, setHistories] = useState<AiRiskAnalysisHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'AI') {
      return;
    }

    let cancelled = false;

    const loadHistories = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getAiRiskAnalysisHistory(page, PAGE_SIZE);

        if (cancelled) {
          return;
        }

        setHistories(response.content);
        setTotalPages(response.totalPages);
      } catch {
        if (cancelled) {
          return;
        }

        setErrorMessage('분석 이력을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadHistories();

    return () => {
      cancelled = true;
    };
  }, [activeTab, page]);

  const handleTabChange = (tab: HistoryTab) => {
    setActiveTab(tab);
    setPage(0);
  };

  const handleHistoryClick = (history: AiRiskAnalysisHistoryItem) => {
    navigate(`/analysis-history/ai/${history.analysisId}`);
  };

  return (
    <main className="analysis-history">
      <div className="analysis-history__container">
        <header className="analysis-history__header">
          <h1>분석 이력</h1>
          <p>전략을 검증하기 위해 실행한 백테스트와 AI 위험 분석 결과를 확인할 수 있습니다.</p>
        </header>

        <div className="analysis-history__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'BACKTEST'}
            className={`analysis-history__tab ${
              activeTab === 'BACKTEST' ? 'analysis-history__tab--active' : ''
            }`}
            onClick={() => handleTabChange('BACKTEST')}
          >
            백테스트
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'AI'}
            className={`analysis-history__tab ${
              activeTab === 'AI' ? 'analysis-history__tab--active' : ''
            }`}
            onClick={() => handleTabChange('AI')}
          >
            AI 위험 분석
          </button>
        </div>

        {activeTab === 'BACKTEST' ? (
          <div className="analysis-history__notice">
            <p>백테스트 전체 이력은 준비 중입니다.</p>
            <span>현재는 각 전략 상세 화면에서 백테스트 이력을 확인할 수 있습니다.</span>
          </div>
        ) : (
          <section className="analysis-history__content">
            {isLoading && (
              <div className="analysis-history__state">
                <LoaderCircle className="analysis-history__spinner" size={24} strokeWidth={1.8} />
                <p>분석 이력을 불러오고 있습니다.</p>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="analysis-history__state analysis-history__state--error">
                <AlertCircle size={24} strokeWidth={1.8} />
                <p>{errorMessage}</p>
              </div>
            )}

            {!isLoading && !errorMessage && histories.length === 0 && (
              <div className="analysis-history__empty">
                <ShieldCheck size={30} strokeWidth={1.6} />
                <strong>아직 AI 위험 분석 이력이 없습니다.</strong>
                <p>백테스트를 완료한 뒤 전략의 위험도를 분석해보세요.</p>
              </div>
            )}

            {!isLoading && !errorMessage && histories.length > 0 && (
              <>
                <div className="analysis-history__list">
                  {histories.map((history) => {
                    const riskLabel = getRiskLabel(history.riskLevel);

                    return (
                      <button
                        key={history.analysisId}
                        type="button"
                        className="analysis-history__item"
                        onClick={() => handleHistoryClick(history)}
                      >
                        <div className="analysis-history__item-main">
                          <div className="analysis-history__item-top">
                            <span className="analysis-history__date">
                              {formatDate(history.createdAt)}
                            </span>

                            {history.status === 'COMPLETED' && riskLabel ? (
                              <span
                                className={`analysis-history__risk analysis-history__risk--${history.riskLevel?.toLowerCase()}`}
                              >
                                위험도 {riskLabel}
                              </span>
                            ) : (
                              <span
                                className={`analysis-history__status analysis-history__status--${history.status.toLowerCase()}`}
                              >
                                {getStatusLabel(history.status)}
                              </span>
                            )}
                          </div>

                          <strong className="analysis-history__title">AI 위험 분석</strong>

                          <p className="analysis-history__summary">
                            {history.summary ??
                              (history.status === 'FAILED'
                                ? '분석을 완료하지 못했습니다. 상세 화면에서 실패 내용을 확인해주세요.'
                                : '위험 분석을 진행하고 있습니다.')}
                          </p>
                        </div>

                        <div className="analysis-history__action">
                          <span>결과 보기</span>
                          <ChevronRight size={18} strokeWidth={1.8} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="analysis-history__pagination">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      이전
                    </button>

                    <span>
                      {page + 1} / {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default AnalysisHistoryPage;
