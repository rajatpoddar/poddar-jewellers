import { Notice } from '@/components/ui/Notice';
import { getStalenessBannerText } from './RateBanner.test';

export function RateBanner({ hoursOld }: { hoursOld: number }) {
  const warning = getStalenessBannerText(hoursOld);
  if (!warning) return null;
  return (
    <div className="bg-surface border-b border-line px-4 py-2 text-center text-sm">
      <Notice tone="warn">{warning}</Notice>
    </div>
  );
}
