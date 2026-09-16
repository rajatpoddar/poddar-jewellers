'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SparklesIcon } from '@/components/ui/icons';
import { rewriteCopyAction } from '@/app/admin/(panel)/ai-copywriter/actions';
import type { CopyContext } from '@/lib/ai-copywriter';

export interface AiRewriteButtonProps {
  text: string;
  context: CopyContext;
  onEnhanced: (enhancedText: string) => void;
  size?: 'sm' | 'md';
}

export function AiRewriteButton({
  text,
  context,
  onEnhanced,
  size = 'sm',
}: AiRewriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleRewrite() {
    if (!text || !text.trim()) return;
    setIsLoading(true);
    try {
      const res = await rewriteCopyAction(text, context);
      if (res?.enhancedText) {
        onEnhanced(res.enhancedText);
      }
    } catch (err) {
      console.error('Failed to rewrite copy:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      intent="quiet"
      size={size}
      onClick={handleRewrite}
      disabled={isLoading || !text || !text.trim()}
      title="Polish and rewrite copy with AI"
    >
      <span className="flex items-center gap-1.5">
        <SparklesIcon />
        <span>{isLoading ? 'Enhancing...' : 'Polish with AI'}</span>
      </span>
    </Button>
  );
}
