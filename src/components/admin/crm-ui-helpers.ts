/**
 * CRM UI pure helper utilities for filtering, consent display,
 * and tag selection. Pure logic, zero side-effects.
 */

export interface CustomerFilterParams {
  optIn?: string | null;
  tagId?: string | null;
  eventWithinDays?: string | null;
  search?: string | null;
}

export interface ParsedCustomerFilters {
  optIn?: boolean;
  tagId?: string;
  eventWithinDays?: number;
  search?: string;
}

/**
 * Parses URL query param string for marketing opt-in into a boolean or undefined.
 */
export function parseOptInFilter(value?: string | null): boolean | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'true' || trimmed === 'opted_in' || trimmed === 'opt-in') {
    return true;
  }
  if (trimmed === 'false' || trimmed === 'non_opted_in' || trimmed === 'non-opted-in') {
    return false;
  }
  return undefined;
}

/**
 * Parses event days query param into a valid positive integer.
 */
export function parseEventWithinDays(value?: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value.trim(), 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Normalizes raw string filters into typed parameters for query execution.
 */
export function normalizeFilterParams(params: CustomerFilterParams): ParsedCustomerFilters {
  const optIn = parseOptInFilter(params.optIn);
  const eventWithinDays = parseEventWithinDays(params.eventWithinDays);
  const tagId = params.tagId?.trim() || undefined;
  const search = params.search?.trim() || undefined;

  return {
    ...(optIn !== undefined ? { optIn } : {}),
    ...(tagId ? { tagId } : {}),
    ...(eventWithinDays ? { eventWithinDays } : {}),
    ...(search ? { search } : {}),
  };
}

/**
 * Returns available tags that have not yet been assigned to the customer.
 */
export function computeUnassignedTags<
  T extends { id: string },
  A extends { id: string } = { id: string },
>(allTags: T[], assignedTags: A[]): T[] {
  const assignedIds = new Set(assignedTags.map((t) => t.id));
  return allTags.filter((tag) => !assignedIds.has(tag.id));
}


/**
 * Returns the badge tone and copy for customer consent.
 */
export function getConsentBadge(marketingOptIn: boolean): {
  tone: 'good' | 'neutral';
  label: string;
} {
  return marketingOptIn
    ? { tone: 'good', label: 'WhatsApp Opt-In: Yes' }
    : { tone: 'neutral', label: 'WhatsApp Opt-In: No' };
}

/**
 * In-memory filter helper for fast client-side previews and unit testing.
 */
export function filterCustomersLocally<
  T extends {
    marketingOptIn: boolean;
    tags: { id: string }[];
    name: string;
    phone: string;
  },
>(
  customers: T[],
  filters: {
    optIn?: boolean;
    tagId?: string;
    search?: string;
  }
): T[] {
  return customers.filter((customer) => {
    if (typeof filters.optIn === 'boolean' && customer.marketingOptIn !== filters.optIn) {
      return false;
    }

    if (filters.tagId && !customer.tags.some((t) => t.id === filters.tagId)) {
      return false;
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const matchName = customer.name.toLowerCase().includes(q);
      const matchPhone = customer.phone.includes(q);
      if (!matchName && !matchPhone) {
        return false;
      }
    }

    return true;
  });
}
