'use client';

import { useState, useEffect, useId, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input, Select, Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export interface FilterOptionTag {
  id: string;
  name: string;
}

export interface CustomerSegmentFilterState {
  optIn?: string;
  tagId?: string;
  eventWithinDays?: string;
  search?: string;
}

export interface CustomerSegmentFiltersProps {
  tags: FilterOptionTag[];
  resultCount: number;
  initialFilters?: CustomerSegmentFilterState;
  onFilterChange?: (filters: CustomerSegmentFilterState) => void;
  className?: string;
}

export function CustomerSegmentFilters({
  tags,
  resultCount,
  initialFilters,
  onFilterChange,
  className,
}: CustomerSegmentFiltersProps) {
  let router: ReturnType<typeof useRouter> | null = null;
  let pathname = '';
  let searchParams: ReturnType<typeof useSearchParams> | null = null;

  try {
    router = useRouter();
    pathname = usePathname();
    searchParams = useSearchParams();
  } catch {
    // Graceful fallback for non-Next environment / unit tests
  }

  const [isPending, startTransition] = useTransition();

  const currentOptIn = searchParams?.get('optIn') ?? initialFilters?.optIn ?? 'all';
  const currentTagId = searchParams?.get('tagId') ?? initialFilters?.tagId ?? '';
  const currentEvent =
    searchParams?.get('eventWithinDays') ?? initialFilters?.eventWithinDays ?? '';
  const currentSearch =
    searchParams?.get('search') ?? searchParams?.get('q') ?? initialFilters?.search ?? '';

  const [searchValue, setSearchValue] = useState(currentSearch);

  // Sync internal search state if external URL changes
  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  const searchId = useId();
  const optInId = useId();
  const tagSelectId = useId();
  const eventId = useId();

  const applyUpdates = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    for (const [key, val] of Object.entries(updates)) {
      if (!val || val === 'all' || val.trim() === '') {
        params.delete(key);
      } else {
        params.set(key, val.trim());
      }
    }

    const nextOptIn = params.get('optIn') || 'all';
    const nextTagId = params.get('tagId') || '';
    const nextEvent = params.get('eventWithinDays') || '';
    const nextSearch = params.get('search') || '';

    if (onFilterChange) {
      onFilterChange({
        optIn: nextOptIn,
        tagId: nextTagId,
        eventWithinDays: nextEvent,
        search: nextSearch,
      });
    }

    if (router && pathname) {
      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      startTransition(() => {
        router?.replace(targetUrl);
      });
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== currentSearch) {
        applyUpdates({ search: searchValue || null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, currentSearch]);

  const hasActiveFilters =
    (currentOptIn && currentOptIn !== 'all') ||
    Boolean(currentTagId) ||
    Boolean(currentEvent) ||
    Boolean(searchValue.trim());

  const handleReset = () => {
    setSearchValue('');
    applyUpdates({
      optIn: null,
      tagId: null,
      eventWithinDays: null,
      search: null,
      q: null,
    });
  };

  return (
    <div
      className={`rounded-card border border-line bg-surface p-4 sm:p-5 space-y-4 shadow-card ${className || ''}`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search Field */}
        <Field label="Search Customers" htmlFor={searchId}>
          <Input
            id={searchId}
            type="text"
            placeholder="Name ya phone number..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            disabled={isPending}
          />
        </Field>

        {/* WhatsApp Opt-In Filter */}
        <Field label="WhatsApp Opt-In" htmlFor={optInId}>
          <Select
            id={optInId}
            value={currentOptIn}
            onChange={(e) => applyUpdates({ optIn: e.target.value })}
            disabled={isPending}
          >
            <option value="all">All</option>
            <option value="true">Opt-In Only</option>
            <option value="false">Non-Opted-In</option>
          </Select>
        </Field>

        {/* Tag Filter */}
        <Field label="Custom Tag" htmlFor={tagSelectId}>
          <Select
            id={tagSelectId}
            value={currentTagId}
            onChange={(e) => applyUpdates({ tagId: e.target.value })}
            disabled={isPending}
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>

        {/* Event Date Range Filter */}
        <Field label="Event Date Range" htmlFor={eventId}>
          <Select
            id={eventId}
            value={currentEvent}
            onChange={(e) => applyUpdates({ eventWithinDays: e.target.value })}
            disabled={isPending}
          >
            <option value="">All Events</option>
            <option value="15">Next 15d</option>
            <option value="30">Next 30d</option>
          </Select>
        </Field>
      </div>

      {/* Live Result Count & Clear Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
        <div className="text-sm font-medium text-ink-muted">
          <span className="numeric font-semibold text-ink">{resultCount}</span>{' '}
          <span>{resultCount === 1 ? 'customer match' : 'customers match'}</span>
          {hasActiveFilters && (
            <span className="ml-2 text-xs text-ink-faint">(Active filters applied)</span>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            intent="quiet"
            size="md"
            disabled={isPending}
            onClick={handleReset}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
