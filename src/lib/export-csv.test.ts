import { describe, it, expect } from 'vitest';
import { formatCustomersToCSV } from './export-csv';

describe('formatCustomersToCSV', () => {
  it('returns header row when customer list is empty', () => {
    const csv = formatCustomersToCSV([]);
    expect(csv.trim()).toBe('Name,Phone,OptInStatus,Tags,WishlistCategory');
  });

  it('formats customers with correct columns and opt-in status', () => {
    const customers = [
      {
        name: 'Aarav Sharma',
        phone: '9876543210',
        marketingOptIn: true,
        tags: [{ name: 'VIP' }, { name: 'Bridal' }],
        wishlistCategories: ['Necklaces', 'Earrings'],
      },
      {
        name: 'Sunita Devi',
        phone: '9123456780',
        marketingOptIn: false,
        tags: [],
        wishlistCategories: [],
      },
    ];

    const csv = formatCustomersToCSV(customers);
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe('Name,Phone,OptInStatus,Tags,WishlistCategory');
    // First row has tags and wishlist with commas, so they must be quoted
    expect(lines[1]).toBe('Aarav Sharma,9876543210,Opted In,"VIP, Bridal","Necklaces, Earrings"');
    // Second row has empty tags and wishlist, OptInStatus is Not Opted In
    expect(lines[2]).toBe('Sunita Devi,9123456780,Not Opted In,,');
  });

  it('handles null names and undefined tags/wishlist gracefully', () => {
    const customers = [
      {
        name: null,
        phone: '9988776655',
        marketingOptIn: true,
      },
    ];

    const csv = formatCustomersToCSV(customers);
    const lines = csv.trim().split('\n');
    expect(lines[1]).toBe(',9988776655,Opted In,,');
  });

  it('properly escapes quotes, commas, and newlines per RFC 4180', () => {
    const customers = [
      {
        name: 'Ramesh "Goldie" Kumar',
        phone: '9876500000',
        marketingOptIn: true,
        tags: [{ name: 'Special, Request' }],
        wishlistCategories: ['Bangles\nSpecial'],
      },
    ];

    const csv = formatCustomersToCSV(customers);
    const lines = csv.trim().split('\n');

    // Quotes escaped by doubling, surrounded by quotes
    expect(csv).toContain('"Ramesh ""Goldie"" Kumar"');
    expect(csv).toContain('"Special, Request"');
    expect(csv).toContain('"Bangles\nSpecial"');
  });
});
