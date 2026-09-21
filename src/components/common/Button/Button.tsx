import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import './Button.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      leadingIcon,
      trailingIcon,
      loading = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const classes = [
      'button',
      `button--${variant}`,
      `button--${size}`,
      fullWidth && 'button--full-width',
      loading && 'button--loading',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {leadingIcon && (
          <span className="button__icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )}

        <span className="button__label">{children}</span>

        {trailingIcon && (
          <span className="button__icon" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
