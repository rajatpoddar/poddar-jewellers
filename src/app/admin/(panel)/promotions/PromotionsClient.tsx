'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Checkbox } from '@/components/ui/Field';
import { CardFieldset, RowList, EmptyState, PageHeader } from '@/components/ui/Surface';
import { Notice, Badge } from '@/components/ui/Notice';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import {
  createPromotionAction,
  togglePromotionActiveAction,
  deletePromotionAction,
  PromotionActionState,
} from './actions';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
}

export interface SerializedPromotion {
  id: string;
  name: string;
  headline: string;
  badgeText: string;
  makingDiscountPercentBp: number;
  scope: 'SHOP_WIDE' | 'CATEGORY' | 'PRODUCT';
  categoryId?: string | null;
  categoryName?: string | null;
  productCount: number;
  productNames: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export function PromotionsClient({
  promotions,
  categories,
  products,
}: {
  promotions: SerializedPromotion[];
  categories: CategoryOption[];
  products: ProductOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [scope, setScope] = useState<'SHOP_WIDE' | 'CATEGORY' | 'PRODUCT'>('SHOP_WIDE');
  const [actionState, setActionState] = useState<PromotionActionState>({});
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const now = new Date();
  const defaultStart = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const defaultEnd = new Date(weekLater.getTime() - weekLater.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  async function handleCreate(formData: FormData) {
    setActionState({});
    startTransition(async () => {
      if (scope === 'PRODUCT') {
        formData.delete('productIds');
        selectedProducts.forEach((id) => formData.append('productIds', id));
      }
      const res = await createPromotionAction(formData);
      if (res.error) {
        setActionState({ error: res.error });
      } else {
        setActionState({ success: true });
        setShowForm(false);
      }
    });
  }

  function handleToggleProduct(productId: string) {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }

  function handleToggleActive(promotionId: string, currentActive: boolean) {
    startTransition(async () => {
      const res = await togglePromotionActiveAction(promotionId, !currentActive);
      if (res.error) {
        setActionState({ error: res.error });
      }
    });
  }

  function handleDelete(promotionId: string) {
    if (!confirm('Kya aap is promotion ko delete karna chahte hain?')) return;
    startTransition(async () => {
      const res = await deletePromotionAction(promotionId);
      if (res.error) {
        setActionState({ error: res.error });
      }
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Promotions & Festive Offers"
        description="Festive discount campaigns, making charge discounts, and store-wide offer banners."
        action={
          <Button intent="primary" onClick={() => setShowForm(!showForm)}>
            <PlusIcon />
            {showForm ? 'Cancel' : 'Naya Promotion'}
          </Button>
        }
      />

      {actionState.error && (
        <Notice tone="danger" title="Error">
          {actionState.error}
        </Notice>
      )}

      {actionState.success && (
        <Notice tone="good" title="Safal">
          Promotion safaltapoorvak save ho gaya.
        </Notice>
      )}

      {showForm && (
        <form action={handleCreate}>
          <CardFieldset
            title="Naya Promotion Banayein"
            hint="Offer ki details aur discount ki shartain Bharein."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Promotion Naam" hint="Internal identification (e.g. Dhanteras 2026)">
                <Input name="name" required placeholder="Dhanteras Special Offer" />
              </Field>

              <Field label="Badge Text" hint="Product badge label (e.g. 25% OFF)">
                <Input name="badgeText" required placeholder="DHANTERAS OFFER" />
              </Field>
            </div>

            <Field label="Headline" hint="Customer-facing offer text">
              <Input name="headline" required placeholder="Flat 25% Off on Making Charges" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Making Discount (%)" hint="Percent off making charge (e.g. 25)">
                <Input
                  name="makingDiscountPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  numeric
                  required
                  placeholder="25"
                />
              </Field>

              <Field label="Offer Scope" hint="Kahan apply hoga">
                <Select
                  name="scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as 'SHOP_WIDE' | 'CATEGORY' | 'PRODUCT')}
                >
                  <option value="SHOP_WIDE">Puri Shop (Shop Wide)</option>
                  <option value="CATEGORY">Khas Category (Category)</option>
                  <option value="PRODUCT">Khas Products (Specific Products)</option>
                </Select>
              </Field>
            </div>

            {scope === 'CATEGORY' && (
              <Field label="Category Select Kijiye">
                <Select name="categoryId" required>
                  <option value="">-- Category Chuniye --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {scope === 'PRODUCT' && (
              <Field label="Products Select Kijiye" hint="Kam se kam ek product chuniye">
                <div className="max-h-48 overflow-y-auto rounded-field border border-line bg-surface p-3 space-y-2">
                  {products.length === 0 ? (
                    <p className="text-sm text-ink-muted">Koi product nahi mila.</p>
                  ) : (
                    products.map((p) => (
                      <div key={p.id}>
                        <Checkbox
                          label={p.name}
                          checked={selectedProducts.includes(p.id)}
                          onChange={() => handleToggleProduct(p.id)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </Field>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start Date & Time">
                <Input name="startDate" type="datetime-local" defaultValue={defaultStart} required />
              </Field>

              <Field label="End Date & Time">
                <Input name="endDate" type="datetime-local" defaultValue={defaultEnd} required />
              </Field>
            </div>

            <Checkbox name="isActive" label="Turant active karein" defaultChecked />

            <div className="flex justify-end gap-3 pt-3">
              <Button type="button" intent="quiet" onClick={() => setShowForm(false)}>
                Radd Karein
              </Button>
              <Button type="submit" intent="primary" disabled={isPending}>
                {isPending ? 'Saving...' : 'Promotion Save Karein'}
              </Button>
            </div>
          </CardFieldset>
        </form>
      )}

      {promotions.length === 0 ? (
        <EmptyState title="Koi promotion nahi hai">
          Dhanteras, Diwali ya seasonal discount campaigns ke liye naya promotion banayein.
        </EmptyState>
      ) : (
        <RowList>
          {promotions.map((p) => {
            const pNow = new Date();
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            const isCurrentActive = p.isActive && pNow >= start && pNow <= end;
            const isScheduled = p.isActive && pNow < start;
            const isEndedOrSuspended = !p.isActive || pNow > end;

            return (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-ink truncate">{p.name}</span>

                    {isCurrentActive && <Badge tone="good">Active</Badge>}
                    {isScheduled && <Badge tone="warn">Scheduled</Badge>}
                    {isEndedOrSuspended && (
                      <Badge tone="neutral">{!p.isActive ? 'Suspended' : 'Ended'}</Badge>
                    )}

                    <Badge tone="neutral">{p.badgeText}</Badge>
                  </div>

                  <p className="text-sm font-medium text-brand">{p.headline}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span>
                      Discount: <strong className="text-ink">{p.makingDiscountPercentBp / 100}% off making</strong>
                    </span>
                    <span>
                      Scope:{' '}
                      <strong className="text-ink">
                        {p.scope === 'SHOP_WIDE'
                          ? 'All Products'
                          : p.scope === 'CATEGORY'
                          ? `Category: ${p.categoryName ?? 'Unknown'}`
                          : `${p.productCount} Products`}
                      </strong>
                    </span>
                    <span>
                      Dates: {start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} -{' '}
                      {end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    intent={p.isActive ? 'secondary' : 'primary'}
                    size="md"
                    disabled={isPending}
                    onClick={() => handleToggleActive(p.id, p.isActive)}
                  >
                    {p.isActive ? 'OFF Karein' : 'ON Karein'}
                  </Button>

                  <Button
                    type="button"
                    intent="danger"
                    size="md"
                    disabled={isPending}
                    onClick={() => handleDelete(p.id)}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            );
          })}
        </RowList>
      )}
    </div>
  );
}
