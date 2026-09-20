import axios from 'axios';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { searchStocks } from '../../api/market';
import { createStrategy } from '../../api/strategy';
import type { MarketStockSearch } from '../../types/market';
import type { StrategyCreateRequest } from '../../types/strategy';
import './StrategyCreatePage.scss';

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

const INITIAL_FORM: StrategyForm = {
  strategyName: '',
  buyConditionPrice: '',
  sellConditionPrice: '',
  stopLossRate: '',
  targetReturnRate: '',
  allocatedAmount: '',
  orderAmount: '',
  perCondition: '',
  pbrCondition: '',
  roeCondition: '',
};

function StrategyCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const stockCode = searchParams.get('stockCode');

  const [stock, setStock] = useState<MarketStockSearch | null>(null);

  const [form, setForm] = useState<StrategyForm>(INITIAL_FORM);

  const [isStockLoading, setIsStockLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stockError, setStockError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!stockCode) {
      return;
    }

    let ignore = false;

    const fetchStock = async () => {
      try {
        const response = await searchStocks(stockCode, 0, 10);

        if (ignore) {
          return;
        }

        const exactStock = response.content.find((item) => item.stockCode === stockCode);

        if (!exactStock) {
          setStockError('선택한 종목 정보를 찾을 수 없습니다.');
          return;
        }

        setStock(exactStock);

        setForm((previous) => ({
          ...previous,
          strategyName: `${exactStock.stockName} 투자 전략`,
        }));
      } catch {
        if (!ignore) {
          setStockError('종목 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) {
          setIsStockLoading(false);
        }
      }
    };

    void fetchStock();

    return () => {
      ignore = true;
    };
  }, [stockCode]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (formError) {
      setFormError('');
    }
  };

  const validateForm = (): string | null => {
    if (!form.strategyName.trim()) {
      return '전략 이름을 입력해주세요.';
    }

    if (!isPositiveNumber(form.buyConditionPrice)) {
      return '매수 기준가를 입력해주세요.';
    }

    if (!isPositiveNumber(form.sellConditionPrice)) {
      return '매도 기준가를 입력해주세요.';
    }

    if (!isPositiveNumber(form.allocatedAmount)) {
      return '전략 배정 금액을 입력해주세요.';
    }

    if (!isPositiveNumber(form.orderAmount)) {
      return '1회 주문 금액을 입력해주세요.';
    }

    if (!isPositiveNumber(form.stopLossRate)) {
      return '손절률을 입력해주세요.';
    }

    if (Number(form.orderAmount) > Number(form.allocatedAmount)) {
      return '1회 주문 금액은 전략 배정 금액보다 클 수 없습니다.';
    }

    const optionalFields: Array<{
      value: string;
      label: string;
    }> = [
      {
        value: form.targetReturnRate,
        label: '목표 수익률',
      },
      {
        value: form.perCondition,
        label: 'PER 조건',
      },
      {
        value: form.pbrCondition,
        label: 'PBR 조건',
      },
      {
        value: form.roeCondition,
        label: 'ROE 조건',
      },
    ];

    const invalidOptionalField = optionalFields.find(
      ({ value }) => value !== '' && !isPositiveNumber(value)
    );

    if (invalidOptionalField) {
      return `${invalidOptionalField.label}은(는) 0보다 큰 값을 입력해주세요.`;
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stock || isSubmitting) {
      return;
    }

    const validationMessage = validateForm();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const request: StrategyCreateRequest = {
      stockId: stock.stockId,
      stockCode: stock.stockCode,
      strategyName: form.strategyName.trim(),
      buyConditionPrice: Number(form.buyConditionPrice),
      sellConditionPrice: Number(form.sellConditionPrice),
      stopLossRate: Number(form.stopLossRate),
      allocatedAmount: Number(form.allocatedAmount),
      orderAmount: Number(form.orderAmount),
      ...toOptionalNumber('targetReturnRate', form.targetReturnRate),
      ...toOptionalNumber('perCondition', form.perCondition),
      ...toOptionalNumber('pbrCondition', form.pbrCondition),
      ...toOptionalNumber('roeCondition', form.roeCondition),
    };

    setIsSubmitting(true);
    setFormError('');

    try {
      const created = await createStrategy(request);

      navigate(`/strategies/${created.strategyId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError(error.response?.data?.message ?? '전략을 생성하지 못했습니다.');
      } else {
        setFormError('전략을 생성하지 못했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stockCode) {
    return (
      <section className="strategy-create">
        <div className="strategy-create__state">
          <strong>선택된 종목이 없습니다.</strong>
          <p>종목을 먼저 선택한 뒤 전략을 만들어주세요.</p>

          <button type="button" onClick={() => navigate('/stocks')}>
            종목 탐색하기
          </button>
        </div>
      </section>
    );
  }

  if (isStockLoading) {
    return (
      <section className="strategy-create">
        <div className="strategy-create__state">종목 정보를 불러오는 중입니다.</div>
      </section>
    );
  }

  if (stockError || !stock) {
    return (
      <section className="strategy-create">
        <div className="strategy-create__state">
          {stockError || '종목 정보를 찾을 수 없습니다.'}
        </div>
      </section>
    );
  }

  return (
    <section className="strategy-create">
      <header className="strategy-create__header">
        <span>전략 만들기</span>
        <h1>{stock.stockName}</h1>
        <p>
          {stock.stockCode} · {stock.marketType}
        </p>
      </header>

      <form className="strategy-create__form" onSubmit={handleSubmit}>
        <section className="strategy-create__section">
          <div className="strategy-create__section-heading">
            <div>
              <h2>전략 이름</h2>
              <p>나중에 전략을 쉽게 구분할 수 있는 이름을 입력해주세요.</p>
            </div>
          </div>

          <div className="strategy-create__single-field">
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

        <section className="strategy-create__section">
          <div className="strategy-create__section-heading">
            <div>
              <h2>매매 조건</h2>
              <p>주식을 매수하고 매도할 기준 가격을 설정합니다.</p>
            </div>
          </div>

          <div className="strategy-create__field-grid">
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

        <section className="strategy-create__section">
          <div className="strategy-create__section-heading">
            <div>
              <h2>투자 지표 조건</h2>
              <p>필요한 지표만 입력할 수 있습니다.</p>
            </div>

            <span>선택</span>
          </div>

          <div className="strategy-create__field-grid strategy-create__field-grid--three">
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
        </section>

        <section className="strategy-create__section">
          <div className="strategy-create__section-heading">
            <div>
              <h2>투자 설정</h2>
              <p>전략에 사용할 금액과 손실·수익 기준을 설정합니다.</p>
            </div>
          </div>

          <div className="strategy-create__field-grid">
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
          <div className="strategy-create__error" role="alert">
            {formError}
          </div>
        )}

        <div className="strategy-create__actions">
          <button
            type="button"
            className="strategy-create__cancel"
            onClick={() => navigate(`/stocks/${stock.stockCode}`)}
            disabled={isSubmitting}
          >
            취소
          </button>

          <button type="submit" className="strategy-create__submit" disabled={isSubmitting}>
            {isSubmitting ? '전략을 만들고 있습니다...' : '전략 만들기'}
          </button>
        </div>
      </form>
    </section>
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
    <label className="strategy-create__field">
      <span className="strategy-create__field-label">
        {label}

        {required && <em aria-hidden="true">*</em>}

        {optional && <small>선택</small>}
      </span>

      <div className="strategy-create__input-wrap">
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

function isPositiveNumber(value: string): boolean {
  if (value.trim() === '') {
    return false;
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0;
}

function toOptionalNumber<
  K extends 'targetReturnRate' | 'perCondition' | 'pbrCondition' | 'roeCondition',
>(key: K, value: string): Partial<Record<K, number>> {
  if (value.trim() === '') {
    return {};
  }

  return {
    [key]: Number(value),
  } as Partial<Record<K, number>>;
}

export default StrategyCreatePage;
