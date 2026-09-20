import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getAiRiskAnalysis } from '../../api/aiRisk';
import type { AiRiskAnalysisDetail, RiskFactorType, RiskLevel } from '../../types/aiRisk';

import '../strategies/AiRiskAnalysisPage.scss';

function AiRiskAnalysisDetailPage() {
  const { analysisId } = useParams<{ analysisId: string }>();

  const [analysis, setAnalysis] = useState<AiRiskAnalysisDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) {
      return;
    }

    let cancelled = false;

    const loadAnalysis = async () => {
      try {
        setErrorMessage(null);

        const response = await getAiRiskAnalysis(analysisId);

        if (cancelled) {
          return;
        }

        setAnalysis(response);
      } catch {
        if (cancelled) {
          return;
        }

        setErrorMessage('AI 위험 분석 결과를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (!analysisId) {
    return (
      <main className="ai-risk-page">
        <div className="ai-risk-page__container">
          <div className="ai-risk-page__error">
            <AlertCircle size={24} strokeWidth={1.8} />

            <div>
              <strong>분석 정보를 확인할 수 없습니다.</strong>
              <p>분석 이력에서 다시 선택해주세요.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="ai-risk-page">
        <div className="ai-risk-page__container">
          <div className="ai-risk-page__loading">
            <LoaderCircle className="ai-risk-page__spinner" size={26} strokeWidth={1.8} />
            <p>분석 결과를 불러오고 있습니다.</p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !analysis) {
    return (
      <main className="ai-risk-page">
        <div className="ai-risk-page__container">
          <div className="ai-risk-page__error">
            <AlertCircle size={24} strokeWidth={1.8} />

            <div>
              <strong>분석 결과를 불러오지 못했습니다.</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ai-risk-page">
      <div className="ai-risk-page__container">
        <header className="ai-risk-page__header">
          <div>
            <h1>AI 위험 분석 결과</h1>
            <p>이전에 실행한 전략 위험 분석 결과를 확인합니다.</p>
          </div>
        </header>

        {analysis.status === 'PENDING' && (
          <section className="ai-risk-page__pending">
            <LoaderCircle className="ai-risk-page__spinner" size={24} strokeWidth={1.8} />

            <div>
              <strong>분석이 진행 중입니다.</strong>
              <p>분석이 완료되면 위험 등급과 상세 분석 결과를 확인할 수 있습니다.</p>
            </div>
          </section>
        )}

        {analysis.status === 'FAILED' && (
          <section className="ai-risk-page__error">
            <AlertCircle size={24} strokeWidth={1.8} />

            <div>
              <strong>위험 분석을 완료하지 못했습니다.</strong>

              <p>{analysis.message || '분석 처리 중 오류가 발생했습니다.'}</p>

              {analysis.failureType && (
                <span className="ai-risk-page__failure-code">
                  {getFailureTypeLabel(analysis.failureType)}
                </span>
              )}
            </div>
          </section>
        )}

        {analysis.status === 'COMPLETED' && (
          <div className="ai-risk-page__result">
            <section className="ai-risk-page__result-summary">
              <div className="ai-risk-page__result-status">
                <CheckCircle2 size={16} strokeWidth={1.8} />
                분석 완료
              </div>

              <div className="ai-risk-page__risk-heading">
                <div>
                  <span>위험 등급</span>
                  <RiskLevelLabel level={analysis.riskLevel} />
                </div>

                {analysis.summary && <p>{analysis.summary}</p>}
              </div>
            </section>

            {analysis.riskFactors && analysis.riskFactors.length > 0 && (
              <section className="ai-risk-page__section">
                <div className="ai-risk-page__section-header">
                  <h2>주요 위험 요인</h2>
                </div>

                <div className="ai-risk-page__factors">
                  {analysis.riskFactors.map((factor, index) => (
                    <div key={`${factor.type}-${index}`} className="ai-risk-page__factor">
                      <span>{getRiskFactorLabel(factor.type)}</span>
                      <p>{factor.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {analysis.reasoning && (
              <section className="ai-risk-page__section">
                <div className="ai-risk-page__section-header">
                  <h2>분석 근거</h2>
                </div>

                <p className="ai-risk-page__reasoning">{analysis.reasoning}</p>
              </section>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <section className="ai-risk-page__section">
                <div className="ai-risk-page__section-header">
                  <h2>검토 사항</h2>
                </div>

                <ul className="ai-risk-page__recommendations">
                  {analysis.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </section>
            )}

            <p className="ai-risk-page__notice">
              분석 결과는 투자 판단을 돕기 위한 참고 정보이며 수익을 보장하지 않습니다.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

interface RiskLevelLabelProps {
  level: RiskLevel | null;
}

function RiskLevelLabel({ level }: RiskLevelLabelProps) {
  if (!level) {
    return <strong>-</strong>;
  }

  return (
    <strong className={`ai-risk-page__risk-level ai-risk-page__risk-level--${level.toLowerCase()}`}>
      {getRiskLevelLabel(level)}
    </strong>
  );
}

function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'LOW':
      return '낮음';

    case 'MEDIUM':
      return '보통';

    case 'HIGH':
      return '높음';
  }
}

function getRiskFactorLabel(type: RiskFactorType): string {
  switch (type) {
    case 'MAX_DRAWDOWN':
      return '최대 낙폭';

    case 'CONSECUTIVE_LOSS':
      return '연속 손실';

    case 'LOW_WIN_RATE':
      return '낮은 승률';

    case 'LOW_TRADE_COUNT':
      return '거래 표본';

    case 'STOP_LOSS_RISK':
      return '손절 조건';

    case 'FINANCIAL_INDICATOR_RISK':
      return '재무지표';
  }
}

function getFailureTypeLabel(type: NonNullable<AiRiskAnalysisDetail['failureType']>): string {
  switch (type) {
    case 'LLM_API_ERROR':
      return 'AI 서비스 호출 오류';

    case 'RESPONSE_PARSE_ERROR':
      return '응답 처리 오류';

    case 'VALIDATION_ERROR':
      return '응답 검증 오류';

    case 'INTERNAL_ERROR':
      return '내부 처리 오류';

    case 'PROMPT_NOT_FOUND':
      return '분석 프롬프트 오류';
  }
}

export default AiRiskAnalysisDetailPage;
