import axios from 'axios';
import { ArrowLeft, Save } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getStrategy, updateStrategy } from '../../api/strategy';
import Button from '../../components/common/Button/Button';
import type { StrategyDetail, StrategyUpdateRequest } from '../../types/strategy';
import { invalidateStrategyValidation } from '../../utils/strategyValidation';

import './StrategyEditPage.scss';

interface StrategyForm {
  strategyName: string;
  buyConditionPrice: string;
  sellConditionPrice: string;
  stopLossRate: string;
  targetReturnRate: string;
  allocatedAmount: string;
  orderAmount: string;
  perCondition: string;
  pbrCondition: string;
  roeCondition: string;
}

type StrategyFormField = keyof StrategyForm;

function StrategyEditPage() {
  const navigate = useNavigate();
  const { strategyId } = useParams<{ strategyId: string }>();

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [form, setForm] = useState<StrategyForm | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!strategyId) {
      return;
    }

    let cancelled = false;

    const loadStrategy = async () => {
      try {
        const response = await getStrategy(strategyId);

        if (cancelled) {
          return;
        }

        setStrategy(response);

        setForm({
          strategyName: response.strategyName,
          buyConditionPrice: String(response.buyConditionPrice),
          sellConditionPrice: String(response.sellConditionPrice),
          stopLossRate: String(response.stopLossRate),
          targetReturnRate: toFormValue(response.targetReturnRate),
          allocatedAmount: String(response.allocatedAmount),
          orderAmount: String(response.orderAmount),
          perCondition: toFormValue(response.perCondition),
          pbrCondition: toFormValue(response.pbrCondition),
          roeCondition: toFormValue(response.roeCondition),
        });
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error, '전략 정보를 불러오지 못했습니다.'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadStrategy();

    return () => {
      cancelled = true;
    };
  }, [strategyId]);

  useEffect(() => {
    document.title = strategy ? `${strategy.strategyName} 수정 | SAJO` : '전략 수정 | SAJO';
  }, [strategy]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((previous) =>
      previous
        ? {
            ...previous,
            [name]: value,
          }
        : previous
    );

    if (formError) {
      setFormError('');
    }
  };

  const validateForm = (): string | null => {
    if (!form || !strategy) {
      return '전략 정보를 확인할 수 없습니다.';
    }

    if (!form.strategyName.trim()) {
      return '전략 이름을 입력해주세요.';
    }

    if (!isPositiveNumber(form.buyConditionPrice)) {
      return '매수 기준가를 입력해주세요.';
    }

    if (!isPositiveNumber(form.sellConditionPrice)) {
      return '매도 기준가를 입력해주세요.';
    }

    if (Number(form.buyConditionPrice) >= Number(form.sellConditionPrice)) {
      return '매수 기준가는 매도 기준가보다 작아야 합니다.';
    }

    if (!isPositiveNumber(form.allocatedAmount)) {
      return '전략 배정 금액을 입력해주세요.';
    }

    if (!isPositiveNumber(form.orderAmount)) {
      return '1회 주문 금액을 입력해주세요.';
    }

    if (Number(form.orderAmount) > Number(form.allocatedAmount)) {
      return '1회 주문 금액은 전략 배정 금액보다 클 수 없습니다.';
    }

    if (!isPositiveNumber(form.stopLossRate)) {
      return '손절률을 입력해주세요.';
    }

    const optionalFields = [
      {
        key: 'targetReturnRate' as const,
        value: form.targetReturnRate,
        originalValue: strategy.targetReturnRate,
        label: '목표 수익률',
      },
      {
        key: 'perCondition' as const,
        value: form.perCondition,
        originalValue: strategy.perCondition,
        label: 'PER 조건',
      },
      {
        key: 'pbrCondition' as const,
        value: form.pbrCondition,
        originalValue: strategy.pbrCondition,
        label: 'PBR 조건',
      },
      {
        key: 'roeCondition' as const,
        value: form.roeCondition,
        originalValue: strategy.roeCondition,
        label: 'ROE 조건',
      },
    ];

    for (const field of optionalFields) {
      if (field.value !== '' && !isPositiveNumber(field.value)) {
        return `${field.label}은(는) 0보다 큰 값을 입력해주세요.`;
      }

      /*
       * 현재 백엔드 PATCH는 null을 "값 제거"가 아니라
       * "변경하지 않음"으로 처리한다.
       *
       * 따라서 기존 값이 있는 선택 조건을 빈 값으로 만드는 UX는
       * 현재 API에서 지원할 수 없다.
       */
      if (field.originalValue !== null && field.value.trim() === '') {
        return `${field.label}은(는) 현재 수정 화면에서 제거할 수 없습니다. 값을 변경하거나 기존 값을 유지해주세요.`;
      }
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!strategyId || !strategy || !form || isSubmitting) {
      return;
    }

    if (strategy.status === 'ACTIVE') {
      setFormError('운용 중인 전략은 수정할 수 없습니다. 먼저 전략을 비활성화해주세요.');
      return;
    }

    const validationMessage = validateForm();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const request = buildUpdateRequest(strategy, form);

    /*
     * 아무 값도 변경하지 않았다면 API를 호출할 필요가 없다.
     */
    if (Object.keys(request).length === 0) {
      navigate(`/strategies/${strategyId}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      await updateStrategy(strategyId, request);

      invalidateStrategyValidation(strategyId);

      navigate(`/strategies/${strategyId}`);
    } catch (error) {
      setFormError(getErrorMessage(error, '전략을 수정하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="strategy-edit">
        <div className="strategy-edit__state">전략 정보를 불러오고 있습니다.</div>
      </main>
    );
  }

  if (pageError || !strategy || !form) {
    return (
      <main className="strategy-edit">
        <div className="strategy-edit__state">
          <strong>전략 정보를 불러오지 못했습니다.</strong>

          <p>{pageError || '전략을 찾을 수 없습니다.'}</p>

          <Button
            variant="primary"
            size="md"
            leadingIcon={<ArrowLeft size={16} />}
            onClick={() => navigate('/strategies')}
          >
            전략 목록으로
          </Button>
        </div>
      </main>
    );
  }

  if (strategy.status === 'ACTIVE') {
    return (
      <main className="strategy-edit">
        <div className="strategy-edit__state">
          <strong>운용 중인 전략은 수정할 수 없습니다.</strong>

          <p>전략 상세에서 자동매매를 중지하고 전략을 비활성화한 후 다시 시도해주세요.</p>

          <Button
            variant="primary"
            size="md"
            leadingIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(`/strategies/${strategy.strategyId}`)}
          >
            전략 상세로
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="strategy-edit">
      <header className="strategy-edit__header">
        <span>전략 수정</span>

        <h1>{strategy.strategyName}</h1>

        <p>{strategy.stockCode} · 종목은 변경할 수 없습니다.</p>
      </header>

      <form className="strategy-edit__form" onSubmit={handleSubmit}>
        <section className="strategy-edit__section">
          <div className="strategy-edit__section-heading">
            <div>
              <h2>전략 이름</h2>

              <p>전략 목록에서 쉽게 구분할 수 있는 이름을 입력해주세요.</p>
            </div>
          </div>

          <div className="strategy-edit__single-field">
            <FormField
              label="전략 이름"
              name="strategyName"
              value={form.strategyName}
              placeholder="전략 이름을 입력해주세요."
              onChange={handleChange}
              required
            />
          </div>
        </section>

        <section className="strategy-edit__section">
          <div className="strategy-edit__section-heading">
            <div>
              <h2>매매 조건</h2>

              <p>주식을 매수하고 매도할 기준 가격을 설정합니다.</p>
            </div>
          </div>

          <div className="strategy-edit__field-grid">
            <FormField
              label="매수 기준가"
              name="buyConditionPrice"
              value={form.buyConditionPrice}
              placeholder="0"
              suffix="원"
              type="number"
              onChange={handleChange}
              required
            />

            <FormField
              label="매도 기준가"
              name="sellConditionPrice"
              value={form.sellConditionPrice}
              placeholder="0"
              suffix="원"
              type="number"
              onChange={handleChange}
              required
            />
          </div>
        </section>

        <section className="strategy-edit__section">
          <div className="strategy-edit__section-heading">
            <div>
              <h2>투자 지표 조건</h2>

              <p>기존 조건의 값을 변경할 수 있습니다.</p>
            </div>

            <span>선택</span>
          </div>

          <div className="strategy-edit__field-grid strategy-edit__field-grid--three">
            <FormField
              label="PER"
              name="perCondition"
              value={form.perCondition}
              placeholder="제한 없음"
              suffix="배"
              type="number"
              step="0.01"
              onChange={handleChange}
            />

            <FormField
              label="PBR"
              name="pbrCondition"
              value={form.pbrCondition}
              placeholder="제한 없음"
              suffix="배"
              type="number"
              step="0.01"
              onChange={handleChange}
            />

            <FormField
              label="ROE"
              name="roeCondition"
              value={form.roeCondition}
              placeholder="제한 없음"
              suffix="%"
              type="number"
              step="0.01"
              onChange={handleChange}
            />
          </div>

          <p className="strategy-edit__field-notice">
            기존에 설정된 선택 조건은 현재 API 정책상 완전히 제거할 수 없으며 값 변경만 가능합니다.
          </p>
        </section>

        <section className="strategy-edit__section">
          <div className="strategy-edit__section-heading">
            <div>
              <h2>투자 설정</h2>

              <p>전략에 사용할 금액과 손실·수익 기준을 설정합니다.</p>
            </div>
          </div>

          <div className="strategy-edit__field-grid">
            <FormField
              label="전략 배정 금액"
              name="allocatedAmount"
              value={form.allocatedAmount}
              placeholder="0"
              suffix="원"
              type="number"
              onChange={handleChange}
              required
            />

            <FormField
              label="1회 주문 금액"
              name="orderAmount"
              value={form.orderAmount}
              placeholder="0"
              suffix="원"
              type="number"
              onChange={handleChange}
              required
            />

            <FormField
              label="목표 수익률"
              name="targetReturnRate"
              value={form.targetReturnRate}
              placeholder="설정 안 함"
              suffix="%"
              type="number"
              step="0.01"
              onChange={handleChange}
              optional
            />

            <FormField
              label="손절률"
              name="stopLossRate"
              value={form.stopLossRate}
              placeholder="0"
              suffix="%"
              type="number"
              step="0.01"
              onChange={handleChange}
              required
            />
          </div>
        </section>

        {formError && (
          <div className="strategy-edit__error" role="alert">
            {formError}
          </div>
        )}

        <div className="strategy-edit__actions">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={isSubmitting}
            onClick={() => navigate(`/strategies/${strategy.strategyId}`)}
          >
            취소
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="strategy-edit__submit"
            leadingIcon={!isSubmitting ? <Save size={16} /> : undefined}
            loading={isSubmitting}
          >
            {isSubmitting ? '저장하고 있습니다...' : '변경사항 저장'}
          </Button>
        </div>
      </form>
    </main>
  );
}

interface FormFieldProps {
  label: string;
  name: StrategyFormField;
  value: string;
  placeholder: string;
  type?: 'text' | 'number';
  suffix?: string;
  step?: string;
  required?: boolean;
  optional?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function FormField({
  label,
  name,
  value,
  placeholder,
  type = 'text',
  suffix,
  step,
  required = false,
  optional = false,
  onChange,
}: FormFieldProps) {
  return (
    <label className="strategy-edit__field">
      <span className="strategy-edit__field-label">
        {label}

        {required && <em aria-hidden="true">*</em>}

        {optional && <small>선택</small>}
      </span>

      <div className="strategy-edit__input-wrap">
        <input
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          min={type === 'number' ? '0' : undefined}
          step={step}
          onChange={onChange}
        />

        {suffix && <span>{suffix}</span>}
      </div>
    </label>
  );
}

function buildUpdateRequest(strategy: StrategyDetail, form: StrategyForm): StrategyUpdateRequest {
  const request: StrategyUpdateRequest = {};

  const strategyName = form.strategyName.trim();

  if (strategyName !== strategy.strategyName) {
    request.strategyName = strategyName;
  }

  addChangedNumber(
    request,
    'buyConditionPrice',
    form.buyConditionPrice,
    strategy.buyConditionPrice
  );

  addChangedNumber(
    request,
    'sellConditionPrice',
    form.sellConditionPrice,
    strategy.sellConditionPrice
  );

  addChangedNumber(request, 'stopLossRate', form.stopLossRate, strategy.stopLossRate);

  addChangedNumber(request, 'allocatedAmount', form.allocatedAmount, strategy.allocatedAmount);

  addChangedNumber(request, 'orderAmount', form.orderAmount, strategy.orderAmount);

  addChangedOptionalNumber(
    request,
    'targetReturnRate',
    form.targetReturnRate,
    strategy.targetReturnRate
  );

  addChangedOptionalNumber(request, 'perCondition', form.perCondition, strategy.perCondition);

  addChangedOptionalNumber(request, 'pbrCondition', form.pbrCondition, strategy.pbrCondition);

  addChangedOptionalNumber(request, 'roeCondition', form.roeCondition, strategy.roeCondition);

  return request;
}

function addChangedNumber<K extends keyof StrategyUpdateRequest>(
  request: StrategyUpdateRequest,
  key: K,
  formValue: string,
  originalValue: number
) {
  const value = Number(formValue);

  if (value !== originalValue) {
    Object.assign(request, {
      [key]: value,
    });
  }
}

function addChangedOptionalNumber<K extends keyof StrategyUpdateRequest>(
  request: StrategyUpdateRequest,
  key: K,
  formValue: string,
  originalValue: number | null
) {
  if (formValue.trim() === '') {
    return;
  }

  const value = Number(formValue);

  if (value !== originalValue) {
    Object.assign(request, {
      [key]: value,
    });
  }
}

function toFormValue(value: number | null): string {
  return value === null ? '' : String(value);
}

function isPositiveNumber(value: string): boolean {
  if (value.trim() === '') {
    return false;
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}

export default StrategyEditPage;
