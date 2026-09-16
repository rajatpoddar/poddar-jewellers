'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Notice';
import { Button } from '@/components/ui/Button';
import { resendNotificationAction } from '@/app/admin/(panel)/orders/actions';

export type NotificationBadgeTone = 'good' | 'warn' | 'danger' | 'neutral';

export interface NotificationStatusConfig {
  label: string;
  tone: NotificationBadgeTone;
  canResend: boolean;
}

export function getNotificationStatusConfig(
  status?: string | null,
  attempts: number = 0,
  maxAttempts: number = 3
): NotificationStatusConfig {
  if (!status) {
    return {
      label: 'Not Sent',
      tone: 'neutral',
      canResend: false,
    };
  }

  const upper = status.toUpperCase();

  if (upper === 'DELIVERED') {
    return {
      label: 'Delivered',
      tone: 'good',
      canResend: false,
    };
  }

  if (upper === 'PENDING') {
    if (attempts > 0) {
      return {
        label: `Retrying (Attempt ${attempts}/${maxAttempts})`,
        tone: 'warn',
        canResend: true,
      };
    }
    return {
      label: 'Pending',
      tone: 'warn',
      canResend: true,
    };
  }

  if (upper === 'FAILED') {
    return {
      label: 'Failed',
      tone: 'danger',
      canResend: true,
    };
  }

  return {
    label: status,
    tone: 'neutral',
    canResend: false,
  };
}

export interface NotificationStatusBadgeProps {
  status?: string | null;
  attempts?: number;
  maxAttempts?: number;
  queueId?: string | null;
  lastError?: string | null;
  showResendButton?: boolean;
  onResend?: () => Promise<void> | void;
  className?: string;
}

export function NotificationStatusBadge({
  status,
  attempts = 0,
  maxAttempts = 3,
  queueId,
  lastError,
  showResendButton = true,
  onResend,
  className,
}: NotificationStatusBadgeProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeStatus = overrideStatus || status;
  const config = getNotificationStatusConfig(activeStatus, attempts, maxAttempts);

  async function handleResend() {
    setIsPending(true);
    setActionError(null);

    try {
      if (onResend) {
        await onResend();
      } else if (queueId) {
        const res = await resendNotificationAction(queueId);
        if (!res.success) {
          setActionError(res.error || 'Resend fail ho gaya');
          setIsPending(false);
          return;
        }
        setOverrideStatus('PENDING');
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Resend fail ho gaya';
      setActionError(msg);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className || ''}`}>
      <Badge tone={config.tone}>{config.label}</Badge>

      {showResendButton && config.canResend && (
        <Button
          type="button"
          intent="secondary"
          size="md"
          disabled={isPending || (!queueId && !onResend)}
          onClick={handleResend}
          className="text-xs min-h-8 py-1 px-2.5 h-auto"
        >
          {isPending ? 'Resending...' : 'Resend Notification'}
        </Button>
      )}

      {actionError && (
        <span className="text-xs text-danger font-medium">{actionError}</span>
      )}

      {lastError && !actionError && config.tone === 'danger' && (
        <span className="text-xs text-ink-muted italic max-w-xs truncate" title={lastError}>
          {lastError}
        </span>
      )}
    </div>
  );
}
