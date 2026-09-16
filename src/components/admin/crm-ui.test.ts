import { describe, it, expect, vi } from 'vitest';
import {
  parseOptInFilter,
  parseEventWithinDays,
  normalizeFilterParams,
  computeUnassignedTags,
  getConsentBadge,
  filterCustomersLocally,
} from './crm-ui-helpers';
import { CustomerSegmentFilters } from './CustomerSegmentFilters';
import { TagBadgeSelect } from './TagBadgeSelect';

describe('CRM UI Helpers', () => {
  describe('parseOptInFilter', () => {
    it('parses opt-in query parameter values correctly', () => {
      expect(parseOptInFilter('true')).toBe(true);
      expect(parseOptInFilter('opted_in')).toBe(true);
      expect(parseOptInFilter('opt-in')).toBe(true);
      expect(parseOptInFilter('TRUE')).toBe(true);

      expect(parseOptInFilter('false')).toBe(false);
      expect(parseOptInFilter('non_opted_in')).toBe(false);
      expect(parseOptInFilter('non-opted-in')).toBe(false);
      expect(parseOptInFilter('FALSE')).toBe(false);

      expect(parseOptInFilter('all')).toBeUndefined();
      expect(parseOptInFilter('')).toBeUndefined();
      expect(parseOptInFilter('   ')).toBeUndefined();
      expect(parseOptInFilter(null)).toBeUndefined();
      expect(parseOptInFilter(undefined)).toBeUndefined();
    });
  });

  describe('parseEventWithinDays', () => {
    it('parses positive integer day counts', () => {
      expect(parseEventWithinDays('15')).toBe(15);
      expect(parseEventWithinDays('30')).toBe(30);
      expect(parseEventWithinDays('  15  ')).toBe(15);
    });

    it('returns undefined for invalid, zero, or negative numbers', () => {
      expect(parseEventWithinDays('0')).toBeUndefined();
      expect(parseEventWithinDays('-5')).toBeUndefined();
      expect(parseEventWithinDays('abc')).toBeUndefined();
      expect(parseEventWithinDays('')).toBeUndefined();
      expect(parseEventWithinDays(null)).toBeUndefined();
      expect(parseEventWithinDays(undefined)).toBeUndefined();
    });
  });

  describe('normalizeFilterParams', () => {
    it('normalizes complete filter query object into typed values', () => {
      const normalized = normalizeFilterParams({
        optIn: 'true',
        tagId: 'tag_bridal',
        eventWithinDays: '15',
        search: 'Aarav',
      });

      expect(normalized).toEqual({
        optIn: true,
        tagId: 'tag_bridal',
        eventWithinDays: 15,
        search: 'Aarav',
      });
    });

    it('omits undefined or empty filter fields', () => {
      const normalized = normalizeFilterParams({
        optIn: 'all',
        tagId: '',
        eventWithinDays: undefined,
        search: '   ',
      });

      expect(normalized).toEqual({});
    });
  });

  describe('computeUnassignedTags', () => {
    const allTags = [
      { id: 't1', name: 'VIP' },
      { id: 't2', name: 'Bridal' },
      { id: 't3', name: 'Gold Investor' },
    ];

    it('returns all tags when customer has none assigned', () => {
      const unassigned = computeUnassignedTags(allTags, []);
      expect(unassigned).toEqual(allTags);
    });

    it('filters out already assigned tags', () => {
      const unassigned = computeUnassignedTags(allTags, [{ id: 't2', name: 'Bridal' }]);
      expect(unassigned).toEqual([
        { id: 't1', name: 'VIP' },
        { id: 't3', name: 'Gold Investor' },
      ]);
    });

    it('returns empty list when all tags are assigned', () => {
      const unassigned = computeUnassignedTags(allTags, allTags);
      expect(unassigned).toEqual([]);
    });
  });

  describe('getConsentBadge', () => {
    it('returns good tone and WhatsApp Opt-In: Yes when opt-in is true', () => {
      const badge = getConsentBadge(true);
      expect(badge).toEqual({
        tone: 'good',
        label: 'WhatsApp Opt-In: Yes',
      });
    });

    it('returns neutral tone and WhatsApp Opt-In: No when opt-in is false', () => {
      const badge = getConsentBadge(false);
      expect(badge).toEqual({
        tone: 'neutral',
        label: 'WhatsApp Opt-In: No',
      });
    });
  });

  describe('filterCustomersLocally', () => {
    const mockCustomers = [
      {
        id: '1',
        name: 'Aarav Kumar',
        phone: '9876543210',
        marketingOptIn: true,
        tags: [{ id: 't1', name: 'VIP' }],
      },
      {
        id: '2',
        name: 'Priya Sharma',
        phone: '9123456780',
        marketingOptIn: false,
        tags: [{ id: 't2', name: 'Bridal' }],
      },
      {
        id: '3',
        name: 'Vikram Singh',
        phone: '9876500000',
        marketingOptIn: true,
        tags: [
          { id: 't1', name: 'VIP' },
          { id: 't2', name: 'Bridal' },
        ],
      },
    ];

    it('filters by optIn status', () => {
      const optedIn = filterCustomersLocally(mockCustomers, { optIn: true });
      expect(optedIn.map((c) => c.name)).toEqual(['Aarav Kumar', 'Vikram Singh']);

      const nonOptedIn = filterCustomersLocally(mockCustomers, { optIn: false });
      expect(nonOptedIn.map((c) => c.name)).toEqual(['Priya Sharma']);
    });

    it('filters by tagId', () => {
      const bridal = filterCustomersLocally(mockCustomers, { tagId: 't2' });
      expect(bridal.map((c) => c.name)).toEqual(['Priya Sharma', 'Vikram Singh']);
    });

    it('filters by name or phone search case-insensitively', () => {
      const matchName = filterCustomersLocally(mockCustomers, { search: 'priya' });
      expect(matchName.map((c) => c.name)).toEqual(['Priya Sharma']);

      const matchPhone = filterCustomersLocally(mockCustomers, { search: '98765' });
      expect(matchPhone.map((c) => c.name)).toEqual(['Aarav Kumar', 'Vikram Singh']);
    });

    it('combines multiple filters correctly', () => {
      const combined = filterCustomersLocally(mockCustomers, {
        optIn: true,
        tagId: 't1',
        search: 'Vikram',
      });
      expect(combined.map((c) => c.name)).toEqual(['Vikram Singh']);
    });
  });

  describe('Component Function Exports', () => {
    it('CustomerSegmentFilters and TagBadgeSelect components are valid functions', () => {
      expect(typeof CustomerSegmentFilters).toBe('function');
      expect(typeof TagBadgeSelect).toBe('function');
    });
  });
});
