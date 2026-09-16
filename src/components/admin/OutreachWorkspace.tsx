'use client';

import { useState, useId, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea, Select } from '@/components/ui/Field';
import { Card, EmptyState } from '@/components/ui/Surface';
import { Badge, Notice } from '@/components/ui/Notice';
import { SendIcon, DownloadIcon, CheckIcon, PlusIcon, CloseIcon, TrashIcon } from '@/components/ui/icons';
import { interpolateTemplateVariables } from '@/lib/crm-template-helpers';
import { formatEvolutionPhone } from '@/lib/phone';
import { downloadCustomersCSV } from '@/lib/export-csv';
import {
  saveCampaignTemplateAction,
  deleteCampaignTemplateAction,
  logOutreachSentAction,
} from '@/app/admin/(panel)/customers/outreach/actions';

export interface OutreachCustomer {
  id: string;
  name: string | null;
  phone: string;
  marketingOptIn: boolean;
  addressLine1?: string | null;
  city?: string | null;
  pincode?: string | null;
  tags: Array<{ id: string; name: string; color?: string | null }>;
  wishlist?: Array<{
    product?: {
      name?: string;
      category?: { name: string } | null;
    } | null;
  }>;
  orders?: Array<{ id: string }>;
  outreachLogs?: Array<{
    id: string;
    sentAt: string | Date;
    messageText: string;
  }>;
}

export interface CampaignTemplateItem {
  id: string;
  name: string;
  bodyText: string;
}

export interface OutreachWorkspaceProps {
  shopName: string;
  shopPhone: string;
  initialTemplates: CampaignTemplateItem[];
  customers: OutreachCustomer[];
  tags: Array<{ id: string; name: string }>;
}

const VARIABLE_PILLS = [
  { tag: '{{CustomerName}}', label: 'Customer Name' },
  { tag: '{{ShopName}}', label: 'Shop Name' },
  { tag: '{{ShopPhone}}', label: 'Shop Phone' },
  { tag: '{{WishlistCategory}}', label: 'Wishlist Category' },
];

export function OutreachWorkspace({
  shopName,
  shopPhone,
  initialTemplates,
  customers,
}: OutreachWorkspaceProps) {
  const [templates, setTemplates] = useState<CampaignTemplateItem[]>(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplates[0]?.id || ''
  );
  const [bodyText, setBodyText] = useState<string>(
    initialTemplates[0]?.bodyText || 'Namaste {{CustomerName}}, {{ShopName}} ki taraf se naye designs uplabdh hain!'
  );
  const [previewCustomerId, setPreviewCustomerId] = useState<string>(
    customers[0]?.id || ''
  );
  const [sentCustomerIds, setSentCustomerIds] = useState<Set<string>>(new Set());

  // Modal State for Creating New Template
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const templateSelectId = useId();
  const bodyFieldId = useId();
  const previewSelectId = useId();
  const modalNameId = useId();
  const modalBodyId = useId();

  // Find active preview customer
  const previewCustomer =
    customers.find((c) => c.id === previewCustomerId) || customers[0] || null;

  // Compute live interpolated preview text
  const previewVariables = {
    customerName: previewCustomer?.name,
    shopName,
    shopPhone,
    wishlistCategory: previewCustomer?.wishlist?.[0]?.product?.category?.name,
  };
  const livePreviewText = interpolateTemplateVariables(bodyText, previewVariables);

  // Template select change handler
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId || templateId === 'custom') {
      return;
    }
    const found = templates.find((t) => t.id === templateId);
    if (found) {
      setBodyText(found.bodyText);
    }
  };

  // Variable chip insertion helper
  const handleInsertVariable = (variableTag: string, target: 'editor' | 'modal') => {
    if (target === 'editor') {
      setBodyText((prev) => (prev ? `${prev} ${variableTag}` : variableTag));
    } else {
      setNewTemplateBody((prev) => (prev ? `${prev} ${variableTag}` : variableTag));
    }
  };

  // Create Template Handler
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanName = newTemplateName.trim();
    const cleanBody = newTemplateBody.trim();

    if (!cleanName) {
      setModalError('Template ka naam zaroori hai.');
      return;
    }
    if (!cleanBody) {
      setModalError('Template ka message body zaroori hai.');
      return;
    }

    startTransition(async () => {
      const res = await saveCampaignTemplateAction(cleanName, cleanBody);
      if (!res.success || !res.template) {
        setModalError(res.error || 'Template save nahi ho paya.');
        return;
      }

      const created = res.template;
      setTemplates((prev) => [created, ...prev]);
      setSelectedTemplateId(created.id);
      setBodyText(created.bodyText);
      setIsModalOpen(false);
      setNewTemplateName('');
      setNewTemplateBody('');
      setNoticeMessage(`"${created.name}" template safaltapoorvak save ho gaya.`);
    });
  };

  // Delete Template Handler
  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId || selectedTemplateId === 'custom') return;
    const toDelete = templates.find((t) => t.id === selectedTemplateId);
    if (!toDelete) return;

    startTransition(async () => {
      const res = await deleteCampaignTemplateAction(selectedTemplateId);
      if (!res.success) {
        setNoticeMessage(res.error || 'Template delete nahi ho paya.');
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplateId));
      setSelectedTemplateId('custom');
      setNoticeMessage(`Template "${toDelete.name}" hata diya gaya.`);
    });
  };

  // Send WhatsApp Message Handler
  const handleSendWhatsApp = (customer: OutreachCustomer) => {
    const customerVars = {
      customerName: customer.name,
      shopName,
      shopPhone,
      wishlistCategory: customer.wishlist?.[0]?.product?.category?.name,
    };
    const interpolated = interpolateTemplateVariables(bodyText, customerVars);
    const normalizedPhone = formatEvolutionPhone(customer.phone) || `91${customer.phone.replace(/\D/g, '')}`;
    const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(interpolated)}`;

    // Open WhatsApp in a new browser tab
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Record outreach log in background
    const templateIdToLog =
      selectedTemplateId && selectedTemplateId !== 'custom' ? selectedTemplateId : null;
    logOutreachSentAction(customer.id, templateIdToLog, interpolated);

    // Optimistically mark as sent
    setSentCustomerIds((prev) => new Set(prev).add(customer.id));
  };

  // Export Broadcast CSV Handler
  const handleExportCSV = () => {
    const exportList = customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      marketingOptIn: c.marketingOptIn,
      tags: c.tags,
      wishlistCategories: Array.from(
        new Set(
          (c.wishlist || [])
            .map((w) => w.product?.category?.name)
            .filter(Boolean) as string[]
        )
      ),
    }));

    const dateSlug = new Date().toISOString().split('T')[0];
    downloadCustomersCSV(exportList, `broadcast-customers-${dateSlug}.csv`);
  };

  return (
    <div className="space-y-6">
      {noticeMessage && (
        <Notice tone="good" title={noticeMessage} />
      )}

      {/* Top Workspace Grid: Template Composer & Live Message Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Template Composer (7 Cols) */}
        <Card className="p-6 lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                Campaign Message Template
              </h2>
              <p className="text-sm text-ink-muted">
                Templates chunein ya naya sandesh likhein.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                intent="secondary"
                size="md"
                onClick={() => {
                  setNewTemplateName('');
                  setNewTemplateBody(bodyText);
                  setIsModalOpen(true);
                }}
              >
                <PlusIcon />
                Naya Template
              </Button>
              {selectedTemplateId && selectedTemplateId !== 'custom' && (
                <Button
                  intent="danger"
                  size="md"
                  onClick={handleDeleteTemplate}
                  disabled={isPending}
                  aria-label="Delete selected template"
                >
                  <TrashIcon />
                </Button>
              )}
            </div>
          </div>

          <Field label="Saved Templates" htmlFor={templateSelectId}>
            <Select
              id={templateSelectId}
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              <option value="custom">Custom Message (No Template)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Message Body (WhatsApp Text)"
            hint="Aap niche diye gaye variables par click karke message me personalize kar sakte hain."
            htmlFor={bodyFieldId}
          >
            <Textarea
              id={bodyFieldId}
              rows={5}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Namaste {{CustomerName}}, {{ShopName}}..."
            />
          </Field>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Dynamic Variable Tags (Click to insert):
            </p>
            <div className="flex flex-wrap gap-2">
              {VARIABLE_PILLS.map((pill) => (
                <button
                  type="button"
                  key={pill.tag}
                  onClick={() => handleInsertVariable(pill.tag, 'editor')}
                  className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface-sunk px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-ink cursor-pointer"
                >
                  <PlusIcon />
                  {pill.tag}
                  <span className="text-ink-muted">({pill.label})</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Live Customer Preview (5 Cols) */}
        <Card className="p-6 lg:col-span-5 space-y-5 bg-surface">
          <div className="border-b border-line pb-4">
            <h2 className="font-display text-lg font-semibold text-ink">
              Live Message Preview
            </h2>
            <p className="text-sm text-ink-muted">
              Customer ke personalized variables ke saath live preview.
            </p>
          </div>

          <Field label="Preview Customer" htmlFor={previewSelectId}>
            <Select
              id={previewSelectId}
              value={previewCustomerId}
              onChange={(e) => setPreviewCustomerId(e.target.value)}
              disabled={customers.length === 0}
            >
              {customers.length === 0 ? (
                <option value="">Koi customer available nahi hai</option>
              ) : (
                customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || 'Grahak'} ({c.phone})
                  </option>
                ))
              )}
            </Select>
          </Field>

          {previewCustomer ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>
                  Target: <strong className="text-ink">{previewCustomer.name || 'Grahak'}</strong>
                </span>
                <span>
                  Wishlist:{' '}
                  <strong className="text-ink">
                    {previewCustomer.wishlist?.[0]?.product?.category?.name || 'Jewellery'}
                  </strong>
                </span>
              </div>

              <div className="rounded-card border border-line bg-surface-sunk p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">
                {livePreviewText || (
                  <span className="text-ink-faint italic">Koi sandesh darj nahi hai...</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-ink-muted pt-1">
                <span>Length: {livePreviewText.length} characters</span>
                <Badge tone={previewCustomer.marketingOptIn ? 'good' : 'neutral'}>
                  {previewCustomer.marketingOptIn ? 'Opted In' : 'Not Opted In'}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-line p-6 text-center text-sm text-ink-muted">
              Koi customer select nahi kiya gaya.
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Section: Customer Broadcast List */}
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Broadcast Target List ({customers.length})
            </h2>
            <p className="text-sm text-ink-muted">
              1-click se WhatsApp par message bhejein ya broadcast ke liye CSV download karein.
            </p>
          </div>

          <Button
            intent="secondary"
            size="md"
            onClick={handleExportCSV}
            disabled={customers.length === 0}
          >
            <DownloadIcon />
            Export Broadcast CSV
          </Button>
        </div>

        {customers.length === 0 ? (
          <EmptyState title="Koi matching customer nahi mila">
            Filters clear karke dekhein ya naye customer contacts import karein.
          </EmptyState>
        ) : (
          <div className="divide-y divide-line overflow-x-auto">
            {customers.map((c) => {
              const isSent = sentCustomerIds.has(c.id);
              const lastLog = c.outreachLogs?.[0];
              const wishlistCategory = c.wishlist?.[0]?.product?.category?.name;

              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-2 last:pb-2 transition-colors hover:bg-surface-sunk px-2 rounded-card"
                >
                  <div className="min-w-48 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{c.name || 'Grahak'}</span>
                      <span className="text-xs text-ink-muted font-mono">{c.phone}</span>
                      <Badge tone={c.marketingOptIn ? 'good' : 'neutral'}>
                        {c.marketingOptIn ? 'Opted In' : 'No Consent'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      {wishlistCategory && (
                        <span>
                          Wishlist: <span className="text-ink">{wishlistCategory}</span>
                        </span>
                      )}
                      {c.city && <span>City: {c.city}</span>}
                    </div>

                    {c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {c.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-pill border border-line bg-surface-sunk px-2 py-0.5 text-xs text-ink-muted"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="text-right text-xs">
                    {isSent ? (
                      <Badge tone="good">
                        <CheckIcon /> Bheja gaya (Just now)
                      </Badge>
                    ) : lastLog ? (
                      <span className="text-ink-muted">
                        Bheja:{' '}
                        {new Date(lastLog.sentAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-ink-faint">Kabhi nahi bheja</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      intent="quiet"
                      size="md"
                      onClick={() => setPreviewCustomerId(c.id)}
                    >
                      Preview
                    </Button>
                    <Button
                      intent="primary"
                      size="md"
                      onClick={() => handleSendWhatsApp(c)}
                    >
                      <SendIcon />
                      Send on WhatsApp
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create New Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 bg-surface border border-line rounded-card shadow-card space-y-5 text-ink">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="font-display text-xl font-bold text-ink">
                Naya Campaign Template
              </h3>
              <Button
                intent="quiet"
                size="md"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <CloseIcon />
              </Button>
            </div>

            {modalError && <Notice tone="danger" title={modalError} />}

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <Field label="Template Ka Naam *" htmlFor={modalNameId}>
                <Input
                  id={modalNameId}
                  type="text"
                  placeholder="e.g. Diwali Offer, Bridal Showcase"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  required
                />
              </Field>

              <Field
                label="Message Text *"
                hint="Variables par click karke add karein."
                htmlFor={modalBodyId}
              >
                <Textarea
                  id={modalBodyId}
                  rows={4}
                  value={newTemplateBody}
                  onChange={(e) => setNewTemplateBody(e.target.value)}
                  placeholder="Namaste {{CustomerName}}, {{ShopName}}..."
                  required
                />
              </Field>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {VARIABLE_PILLS.map((pill) => (
                  <button
                    type="button"
                    key={pill.tag}
                    onClick={() => handleInsertVariable(pill.tag, 'modal')}
                    className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface-sunk px-2.5 py-0.5 text-xs text-ink cursor-pointer hover:border-brand-line"
                  >
                    <PlusIcon />
                    {pill.tag}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <Button
                  type="button"
                  intent="quiet"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  intent="primary"
                  size="md"
                  disabled={isPending || !newTemplateName.trim() || !newTemplateBody.trim()}
                >
                  {isPending ? 'Save Ho Raha Hai...' : 'Template Save Karein'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
