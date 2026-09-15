'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { parseDiaryContacts, type ParsedContact } from '@/lib/crm/import';
import { importContactsAction } from '../actions';
import { CardFieldset, Card } from '@/components/ui/Surface';
import { Field, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

export function ImportForm() {
  const [rawText, setRawText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const parsedContacts: ParsedContact[] = parseDiaryContacts(rawText);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (parsedContacts.length === 0) {
      setError('Import karne ke liye kam se kam 1 valid contact hona chahiye.');
      return;
    }

    startTransition(async () => {
      const res = await importContactsAction(rawText);
      if (!res.success) {
        setError(res.error || 'Import fail ho gaya.');
      } else {
        setSuccess(`${res.count} contacts successfully import ho gaye!`);
        setRawText('');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Notice tone="danger" title="Import Failed">{error}</Notice>}
      {success && <Notice tone="good" title="Success">{success}</Notice>}

      <CardFieldset
        title="Offline Diary Contacts Paste Karein"
        hint="Har line me format rakhein: Name, Phone, Address, City, Pincode"
      >
        <Field label="Raw Contacts Text" htmlFor="rawText">
          <Textarea
            id="rawText"
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Ramesh Kumar, 9876543210, Main Road
Sita Devi, +91 98351 12345, Cinema Hall Chowk, CityName, 814112`}
          />
        </Field>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-muted">
            {parsedContacts.length} valid {parsedContacts.length === 1 ? 'contact' : 'contacts'} detected
          </span>
          <Button type="submit" disabled={isPending || parsedContacts.length === 0}>
            {isPending ? 'Import ho raha hai...' : '1-Click Import Contacts'}
          </Button>
        </div>
      </CardFieldset>

      {parsedContacts.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-display text-lg text-ink">Parsed Contacts Preview</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead>
                <tr className="border-b border-line text-xs font-medium text-ink-faint uppercase">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">Address</th>
                  <th className="py-2 px-3">City</th>
                  <th className="py-2 px-3">Pincode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {parsedContacts.map((contact, i) => (
                  <tr key={i} className="hover:bg-surface-sunk">
                    <td className="py-2.5 px-3 font-medium">{contact.name}</td>
                    <td className="py-2.5 px-3 numeric">{contact.phone}</td>
                    <td className="py-2.5 px-3 text-ink-muted">{contact.addressLine1 || '-'}</td>
                    <td className="py-2.5 px-3 text-ink-muted">{contact.city || '-'}</td>
                    <td className="py-2.5 px-3 numeric text-ink-muted">{contact.pincode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </form>
  );
}
