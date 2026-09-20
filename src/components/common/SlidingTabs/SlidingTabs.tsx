import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import './SlidingTabs.scss';

interface SlidingTab<T extends string> {
  value: T;
  label: string;
}

interface SlidingTabsProps<T extends string> {
  items: SlidingTab<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'underline' | 'pill';
  size?: 'sm' | 'lg';
  ariaLabel?: string;
}

interface IndicatorStyle extends CSSProperties {
  width: number;
  transform: string;
}

function SlidingTabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  size = 'sm',
  ariaLabel,
}: SlidingTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());

  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeButton = buttonRefs.current.get(value);

    if (!container || !activeButton) {
      return;
    }

    const updateIndicator = () => {
      setIndicatorStyle({
        width: activeButton.offsetWidth,
        transform: `translateX(${activeButton.offsetLeft}px)`,
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(updateIndicator);

    resizeObserver.observe(container);
    resizeObserver.observe(activeButton);

    return () => {
      resizeObserver.disconnect();
    };
  }, [value, items]);

  return (
    <div
      ref={containerRef}
      className={['sliding-tabs', `sliding-tabs--${variant}`, `sliding-tabs--${size}`].join(' ')}
      role="tablist"
      aria-label={ariaLabel}
    >
      <span
        aria-hidden="true"
        className={`sliding-tabs__indicator ${
          indicatorStyle ? 'sliding-tabs__indicator--ready' : ''
        }`}
        style={indicatorStyle ?? undefined}
      />

      {items.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            ref={(element) => {
              if (element) {
                buttonRefs.current.set(item.value, element);
              } else {
                buttonRefs.current.delete(item.value);
              }
            }}
            type="button"
            role="tab"
            aria-selected={active}
            className={`sliding-tabs__tab ${active ? 'sliding-tabs__tab--active' : ''}`}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default SlidingTabs;
