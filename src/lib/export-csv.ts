/**
 * CSV Export utility for customer segmentation and broadcast lists.
 * Implements RFC 4180-compliant quote escaping and UTF-8 export.
 */

export interface ExportCustomerItem {
  name: string | null;
  phone: string;
  marketingOptIn: boolean;
  tags?: Array<{ name: string }>;
  wishlistCategories?: string[];
}

/**
 * Escapes a CSV field value according to RFC 4180 rules.
 * Wraps values containing commas, double quotes, or newlines in quotes,
 * and doubles any internal double quotes.
 */
function escapeCSVField(val: string | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats an array of customer records into an RFC 4180-compliant CSV string.
 * Headers: Name, Phone, OptInStatus, Tags, WishlistCategory
 */
export function formatCustomersToCSV(customers: ExportCustomerItem[]): string {
  const headers = ['Name', 'Phone', 'OptInStatus', 'Tags', 'WishlistCategory'];
  const lines: string[] = [headers.join(',')];

  for (const c of customers) {
    const nameField = escapeCSVField(c.name);
    const phoneField = escapeCSVField(c.phone);
    const optInField = escapeCSVField(c.marketingOptIn ? 'Opted In' : 'Not Opted In');
    const tagsField = escapeCSVField(c.tags ? c.tags.map((t) => t.name).join(', ') : '');
    const wishlistField = escapeCSVField(
      c.wishlistCategories ? c.wishlistCategories.join(', ') : ''
    );

    lines.push([nameField, phoneField, optInField, tagsField, wishlistField].join(','));
  }

  return lines.join('\n');
}

/**
 * Triggers a browser download of the formatted customer CSV file.
 * Safe for SSR (no-ops when window/document are absent).
 */
export function downloadCustomersCSV(
  customers: ExportCustomerItem[],
  filename = 'customers-broadcast.csv'
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const csv = formatCustomersToCSV(customers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exportCustomersToCSV = downloadCustomersCSV;
