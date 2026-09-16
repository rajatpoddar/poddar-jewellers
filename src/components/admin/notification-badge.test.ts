import { describe, it, expect } from 'vitest';
import {
  NotificationStatusBadge,
  getNotificationStatusConfig,
} from './NotificationStatusBadge';

describe('NotificationStatusBadge Status Formatting & Logic', () => {
  it('formats DELIVERED status correctly with good tone and no resend', () => {
    const config = getNotificationStatusConfig('DELIVERED');
    expect(config.label).toBe('Delivered');
    expect(config.tone).toBe('good');
    expect(config.canResend).toBe(false);
  });

  it('formats lowercase delivered status case-insensitively', () => {
    const config = getNotificationStatusConfig('delivered');
    expect(config.label).toBe('Delivered');
    expect(config.tone).toBe('good');
    expect(config.canResend).toBe(false);
  });

  it('formats PENDING with 0 attempts as Pending with warn tone and canResend true', () => {
    const config = getNotificationStatusConfig('PENDING', 0, 3);
    expect(config.label).toBe('Pending');
    expect(config.tone).toBe('warn');
    expect(config.canResend).toBe(true);
  });

  it('formats PENDING with retries (Attempt 1/3)', () => {
    const config = getNotificationStatusConfig('PENDING', 1, 3);
    expect(config.label).toBe('Retrying (Attempt 1/3)');
    expect(config.tone).toBe('warn');
    expect(config.canResend).toBe(true);
  });

  it('formats PENDING with retries and custom maxAttempts (Attempt 2/5)', () => {
    const config = getNotificationStatusConfig('PENDING', 2, 5);
    expect(config.label).toBe('Retrying (Attempt 2/5)');
    expect(config.tone).toBe('warn');
    expect(config.canResend).toBe(true);
  });

  it('formats FAILED status with danger tone and canResend true', () => {
    const config = getNotificationStatusConfig('FAILED');
    expect(config.label).toBe('Failed');
    expect(config.tone).toBe('danger');
    expect(config.canResend).toBe(true);
  });

  it('formats lowercase failed status case-insensitively', () => {
    const config = getNotificationStatusConfig('failed');
    expect(config.label).toBe('Failed');
    expect(config.tone).toBe('danger');
    expect(config.canResend).toBe(true);
  });

  it('handles null or undefined status gracefully', () => {
    const nullConfig = getNotificationStatusConfig(null);
    expect(nullConfig.label).toBe('Not Sent');
    expect(nullConfig.tone).toBe('neutral');
    expect(nullConfig.canResend).toBe(false);

    const undefinedConfig = getNotificationStatusConfig(undefined);
    expect(undefinedConfig.label).toBe('Not Sent');
    expect(undefinedConfig.tone).toBe('neutral');
    expect(undefinedConfig.canResend).toBe(false);
  });

  it('handles unknown status by echoing status name with neutral tone', () => {
    const config = getNotificationStatusConfig('PROCESSING');
    expect(config.label).toBe('PROCESSING');
    expect(config.tone).toBe('neutral');
    expect(config.canResend).toBe(false);
  });

  it('exports NotificationStatusBadge as a React component function', () => {
    expect(typeof NotificationStatusBadge).toBe('function');
  });
});

describe('resendNotificationAction Server Action', () => {
  it('exports resendNotificationAction as a function', async () => {
    const { resendNotificationAction } = await import(
      '@/app/admin/(panel)/orders/actions'
    );
    expect(typeof resendNotificationAction).toBe('function');
  });
});

