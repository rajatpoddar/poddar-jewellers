'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { CardFieldset, RowList, EmptyState, PageHeader } from '@/components/ui/Surface';
import { Notice, Badge } from '@/components/ui/Notice';
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@/components/ui/icons';
import { AiRewriteButton } from '@/components/admin/AiRewriteButton';
import {
  createHeroSlideAction,
  deleteHeroSlideAction,
  reorderHeroSlidesAction,
  CarouselActionState,
} from './actions';

interface PromotionOption {
  id: string;
  name: string;
}

export interface SerializedHeroSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  promotionId?: string | null;
  promotionName?: string | null;
}

export function CarouselClient({
  slides,
  promotions,
}: {
  slides: SerializedHeroSlide[];
  promotions: PromotionOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [actionState, setActionState] = useState<CarouselActionState>({});

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  async function handleCreate(formData: FormData) {
    setActionState({});
    startTransition(async () => {
      const res = await createHeroSlideAction(formData);
      if (res.error) {
        setActionState({ error: res.error });
      } else {
        setActionState({ success: true });
        setTitle('');
        setSubtitle('');
        setShowForm(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Kya aap is hero slide ko delete karna chahte hain?')) return;
    startTransition(async () => {
      const res = await deleteHeroSlideAction(id);
      if (res.error) {
        setActionState({ error: res.error });
      }
    });
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    const newSlideIds = newSlides.map((s) => s.id);

    startTransition(async () => {
      const res = await reorderHeroSlidesAction(newSlideIds);
      if (res.error) {
        setActionState({ error: res.error });
      }
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hero Carousel Banners"
        description="Homepage banner carousel slides, festive promotions, and mobile-optimised banners."
        action={
          <Button intent="primary" onClick={() => setShowForm(!showForm)}>
            <PlusIcon />
            {showForm ? 'Cancel' : 'Nayi Slide'}
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
          Hero slide safaltapoorvak save ho gayi.
        </Notice>
      )}

      {showForm && (
        <form action={handleCreate}>
          <CardFieldset
            title="Nayi Hero Banner Slide Banayein"
            hint="Homepage carousel banner ki details Bharein."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={
                  <div className="flex items-center justify-between">
                    <span>Banner Title</span>
                    <AiRewriteButton
                      text={title}
                      context="headline"
                      onEnhanced={(newText) => setTitle(newText)}
                    />
                  </div>
                }
                hint="Main title heading"
              >
                <Input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Diwali Festive Gold Collection"
                />
              </Field>

              <Field
                label={
                  <div className="flex items-center justify-between">
                    <span>Subtitle</span>
                    <AiRewriteButton
                      text={subtitle}
                      context="subtitle"
                      onEnhanced={(newText) => setSubtitle(newText)}
                    />
                  </div>
                }
                hint="Subheading text (optional)"
              >
                <Input
                  name="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Flat 25% Off on Making Charges"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Desktop Image URL" hint="Path e.g. /uploads/hero-diwali.jpg">
                <Input name="imageUrl" required placeholder="/uploads/hero-banner-1.jpg" />
              </Field>

              <Field label="Mobile Image URL" hint="Optional smaller image for mobile">
                <Input name="mobileImageUrl" placeholder="/uploads/hero-banner-1-mobile.jpg" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Button Label (CTA Text)" hint="Button text e.g. Explore Offers">
                <Input name="ctaText" placeholder="Explore Collection" />
              </Field>

              <Field label="Button Link (CTA URL)" hint="Target link e.g. /catalog?category=gold">
                <Input name="ctaUrl" placeholder="/catalog" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Linked Promotion" hint="Attach a festive promotion banner">
                <Select name="promotionId">
                  <option value="">-- No Promotion Linked --</option>
                  {promotions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Sort Order" hint="Order position (0, 1, 2...)">
                <Input name="sortOrder" type="number" defaultValue={slides.length} numeric />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start Date & Time (Optional)">
                <Input name="startDate" type="datetime-local" />
              </Field>

              <Field label="End Date & Time (Optional)">
                <Input name="endDate" type="datetime-local" />
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button type="button" intent="quiet" onClick={() => setShowForm(false)}>
                Radd Karein
              </Button>
              <Button type="submit" intent="primary" disabled={isPending}>
                {isPending ? 'Saving...' : 'Slide Save Karein'}
              </Button>
            </div>
          </CardFieldset>
        </form>
      )}

      {slides.length === 0 ? (
        <EmptyState title="Koi hero slide nahi hai">
          Homepage par dikhane ke liye pehli hero banner slide banayein.
        </EmptyState>
      ) : (
        <RowList>
          {slides.map((s, idx) => {
            const now = new Date();
            const start = s.startDate ? new Date(s.startDate) : null;
            const end = s.endDate ? new Date(s.endDate) : null;
            const isCurrentActive =
              s.isActive &&
              (!start || now >= start) &&
              (!end || now <= end);
            const isScheduled = s.isActive && start && now < start;
            const isExpired = end && now > end;

            return (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      type="button"
                      intent="quiet"
                      size="md"
                      disabled={idx === 0 || isPending}
                      onClick={() => handleMove(idx, 'up')}
                      aria-label="Move up"
                    >
                      <ChevronUpIcon />
                    </Button>
                    <Button
                      type="button"
                      intent="quiet"
                      size="md"
                      disabled={idx === slides.length - 1 || isPending}
                      onClick={() => handleMove(idx, 'down')}
                      aria-label="Move down"
                    >
                      <ChevronDownIcon />
                    </Button>
                  </div>

                  <div className="relative h-16 w-32 shrink-0 rounded-field overflow-hidden border border-line bg-surface-sunk">
                    <Image
                      src={s.imageUrl}
                      alt={s.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg text-ink truncate">{s.title}</span>

                      {isCurrentActive && <Badge tone="good">Active</Badge>}
                      {isScheduled && <Badge tone="warn">Scheduled</Badge>}
                      {isExpired && <Badge tone="neutral">Expired</Badge>}
                      {s.promotionName && <Badge tone="neutral">{s.promotionName}</Badge>}
                    </div>

                    {s.subtitle && <p className="text-sm text-ink-muted">{s.subtitle}</p>}

                    {s.ctaText && (
                      <p className="text-xs text-brand font-medium">
                        CTA: {s.ctaText} ({s.ctaUrl ?? '#'})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    intent="danger"
                    size="md"
                    disabled={isPending}
                    onClick={() => handleDelete(s.id)}
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
