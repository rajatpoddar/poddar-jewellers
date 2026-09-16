'use client';

import { useState, useTransition } from 'react';
import { CloseIcon, PlusIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { computeUnassignedTags } from './crm-ui-helpers';
import {
  assignCustomerTagAction,
  removeCustomerTagAction,
  createAndAssignTagAction,
} from '@/app/admin/(panel)/customers/actions';

export interface CustomerTagItem {
  id: string;
  name: string;
  color?: string | null;
}

export interface TagBadgeSelectProps {
  customerId: string;
  initialAssignedTags: CustomerTagItem[];
  availableTags: CustomerTagItem[];
  onAssignTag?: (customerId: string, tagId: string) => Promise<{ success: boolean; error?: string }>;
  onRemoveTag?: (customerId: string, tagId: string) => Promise<{ success: boolean; error?: string }>;
  onCreateAndAssignTag?: (
    customerId: string,
    tagName: string
  ) => Promise<{ success: boolean; tag?: CustomerTagItem; error?: string }>;
  readOnly?: boolean;
}

export function TagBadgeSelect({
  customerId,
  initialAssignedTags,
  availableTags,
  onAssignTag = assignCustomerTagAction,
  onRemoveTag = removeCustomerTagAction,
  onCreateAndAssignTag = createAndAssignTagAction,
  readOnly = false,
}: TagBadgeSelectProps) {
  const [assignedTags, setAssignedTags] = useState<CustomerTagItem[]>(initialAssignedTags);
  const [allAvailable, setAllAvailable] = useState<CustomerTagItem[]>(availableTags);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const unassignedTags = computeUnassignedTags(allAvailable, assignedTags);

  const handleAssign = (tag: CustomerTagItem) => {
    setError(null);
    startTransition(async () => {
      // Optimistic update
      setAssignedTags((prev) => [...prev, tag]);

      const res = await onAssignTag(customerId, tag.id);
      if (!res.success) {
        // Rollback on failure
        setAssignedTags((prev) => prev.filter((t) => t.id !== tag.id));
        setError(res.error || 'Tag add nahi ho saka.');
      }
    });
  };

  const handleRemove = (tagId: string) => {
    setError(null);
    const removedTag = assignedTags.find((t) => t.id === tagId);
    if (!removedTag) return;

    startTransition(async () => {
      // Optimistic update
      setAssignedTags((prev) => prev.filter((t) => t.id !== tagId));

      const res = await onRemoveTag(customerId, tagId);
      if (!res.success) {
        // Rollback on failure
        setAssignedTags((prev) => [...prev, removedTag]);
        setError(res.error || 'Tag remove nahi ho saka.');
      }
    });
  };

  const handleCreateAndAssign = () => {
    const clean = newTagName.trim();
    if (!clean) return;

    setError(null);
    startTransition(async () => {
      const res = await onCreateAndAssignTag(customerId, clean);
      if (res.success && res.tag) {
        const created = res.tag;
        setAllAvailable((prev) => {
          if (prev.some((t) => t.id === created.id)) return prev;
          return [...prev, created];
        });
        setAssignedTags((prev) => {
          if (prev.some((t) => t.id === created.id)) return prev;
          return [...prev, created];
        });
        setNewTagName('');
        setIsCreating(false);
      } else {
        setError(res.error || 'Naya tag create nahi ho saka.');
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          Customer Tags & Segmentation
        </span>
        {!readOnly && !isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            disabled={isPending}
            className="cursor-pointer text-xs font-medium text-brand hover:text-brand-strong transition-colors disabled:opacity-50"
          >
            + Naya Tag
          </button>
        )}
      </div>

      {/* Current Assigned Tags */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-7">
        {assignedTags.length === 0 ? (
          <p className="text-xs text-ink-faint">Koi tag assigned nahi hai.</p>
        ) : (
          assignedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface-sunk px-2.5 py-1 text-xs font-medium text-ink"
            >
              <span>{tag.name}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(tag.id)}
                  disabled={isPending}
                  className="cursor-pointer text-ink-muted hover:text-danger transition-colors disabled:opacity-50"
                  aria-label={`Remove tag ${tag.name}`}
                  title={`Remove ${tag.name}`}
                >
                  <CloseIcon />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {/* 1-Click Available Unassigned Tags */}
      {!readOnly && unassignedTags.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs text-ink-faint">Available tags (1-click to add):</p>
          <div className="flex flex-wrap gap-1.5">
            {unassignedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAssign(tag)}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-pill border border-dashed border-line-strong px-2 py-0.5 text-xs text-ink-muted hover:border-brand-line hover:text-brand hover:bg-brand-soft cursor-pointer transition-colors disabled:opacity-50"
                aria-label={`Add tag ${tag.name}`}
                title={`Add ${tag.name}`}
              >
                <PlusIcon />
                <span>{tag.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inline Create New Tag Form */}
      {!readOnly && isCreating && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            type="text"
            placeholder="Tag ka naam..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateAndAssign();
              }
            }}
            disabled={isPending}
            width="auto"
            className="text-xs py-1 min-h-9"
          />
          <Button
            type="button"
            size="md"
            disabled={isPending || !newTagName.trim()}
            onClick={handleCreateAndAssign}
          >
            Save
          </Button>
          <Button
            type="button"
            intent="quiet"
            size="md"
            disabled={isPending}
            onClick={() => {
              setIsCreating(false);
              setNewTagName('');
              setError(null);
            }}
          >
            Radd karein
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
