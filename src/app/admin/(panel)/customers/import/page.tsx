import { PageHeader } from '@/components/ui/Surface';
import { BackLink } from '@/components/ui/BackLink';
import { ImportForm } from './ImportForm';

export const dynamic = 'force-dynamic';

export default function BulkImportPage() {
  return (
    <div className="space-y-6">
      <BackLink href="/admin/customers">Wapas Customers list par</BackLink>
      <PageHeader
        title="Bulk Contact Import"
        description="Puraane offline diary ya khata pustak ke customer contacts ek saath upload karein."
      />
      <ImportForm />
    </div>
  );
}
