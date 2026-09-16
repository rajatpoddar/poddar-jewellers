import { TagIcon } from '@/components/ui/icons';

export interface OfferBadgeProps {
  badgeText: string;
  headline?: string | null;
  className?: string;
}

export function OfferBadge({ badgeText, headline, className = '' }: OfferBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 bg-brand-soft border border-brand-line px-3 py-1 rounded-pill text-xs font-semibold text-brand shadow-sm ${className}`}
    >
      <TagIcon className="w-3.5 h-3.5 text-brand shrink-0" />
      <span className="uppercase tracking-wider font-bold">{badgeText}</span>
      {headline && (
        <>
          <span className="text-line-strong">•</span>
          <span className="font-medium text-ink">{headline}</span>
        </>
      )}
    </div>
  );
}
