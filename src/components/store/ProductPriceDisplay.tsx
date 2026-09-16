import { formatINR } from '@/lib/money';

export interface ProductPriceDisplayProps {
  displayPaise: number;
  originalTotalPaise?: number;
  hasDiscount?: boolean;
  discountAmountPaise?: number;
  className?: string;
  size?: 'md' | 'lg';
}

export function ProductPriceDisplay({
  displayPaise,
  originalTotalPaise,
  hasDiscount = false,
  discountAmountPaise = 0,
  className = '',
  size = 'lg',
}: ProductPriceDisplayProps) {
  const showDiscount =
    hasDiscount &&
    typeof originalTotalPaise === 'number' &&
    originalTotalPaise > displayPaise;

  const priceTextSize = size === 'lg' ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl';
  const originalTextSize = size === 'lg' ? 'text-lg md:text-xl' : 'text-sm md:text-base';

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-baseline flex-wrap gap-3">
        <span className={`font-display font-extrabold text-ink numeric ${priceTextSize}`}>
          {formatINR(displayPaise)}
        </span>

        {showDiscount && (
          <span className={`line-through text-ink-muted font-medium numeric ${originalTextSize}`}>
            {formatINR(originalTotalPaise)}
          </span>
        )}

        {showDiscount && discountAmountPaise > 0 && (
          <span className="inline-flex items-center text-xs font-bold text-good bg-good-soft border border-good-line px-2.5 py-0.5 rounded-pill">
            Save {formatINR(discountAmountPaise)}
          </span>
        )}
      </div>
    </div>
  );
}
