import { Notice } from '@/components/ui/Notice';

export function getStalenessBannerText(hoursOld: number): string | null {
  if (hoursOld > 48) {
    return 'Rate 2 din se update nahi hua — confirm karne ke liye call kariye';
  }
  return null;
}

export function RateBanner({ hoursOld }: { hoursOld: number }) {
  const warning = getStalenessBannerText(hoursOld);
  if (!warning) return null;
  return (
    <div className="bg-surface border-b border-line px-4 py-2 text-center text-sm">
      <Notice tone="warn">{warning}</Notice>
    </div>
  );
}
