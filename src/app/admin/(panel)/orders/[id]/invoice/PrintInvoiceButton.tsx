'use client';

import { Button } from '@/components/ui/Button';

export function PrintInvoiceButton() {
  return (
    <Button
      type="button"
      intent="primary"
      size="md"
      onClick={() => window.print()}
    >
      Print Invoice
    </Button>
  );
}
