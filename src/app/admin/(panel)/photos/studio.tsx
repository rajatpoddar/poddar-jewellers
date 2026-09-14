'use client';

import { useMemo, useState } from 'react';
import {
  SHOT_TYPES,
  getShotType,
  buildPrompts,
  type LayerKey,
} from '@/lib/ai-prompts';
import { Card, CardFieldset } from '@/components/ui/Surface';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { CheckIcon, CopyIcon } from '@/components/ui/icons';

interface Metal {
  id: string;
  label: string;
}

/**
 * The prompts change as the shop types, so this is a client component and the
 * builder runs in the browser. Nothing is saved: a prompt is a thing you carry
 * to another tab once, not a record.
 */
export function PromptStudio({ metals, ground }: { metals: Metal[]; ground: string }) {
  const [shotKey, setShotKey] = useState(SHOT_TYPES[0].key);
  const [metalLabel, setMetalLabel] = useState(metals[0]?.label ?? '');
  const [row, setRow] = useState('1');
  const [piece, setPiece] = useState('1');
  const [layer, setLayer] = useState<LayerKey>('outer');
  const [mark, setMark] = useState('');

  const shot = getShotType(shotKey);

  const prompts = useMemo(
    () =>
      buildPrompts(
        shot,
        {
          // A shop that clears the box should not get "NaN" in its prompt.
          row: Number(row) || 1,
          piece: Number(piece) || 1,
          layer,
          mark,
          purityLabel: metalLabel,
        },
        { ground },
      ),
    [shot, row, piece, layer, mark, metalLabel, ground],
  );

  const needsRow = shot.address === 'row-and-piece';
  const needsPiece = shot.address !== 'layer';
  const needsLayer = shot.address === 'layer';

  return (
    <div className="space-y-6">
      <CardFieldset
        title="Kya banana hai"
        hint="Cheez chuniye, phir tray photo me wo kahan hai aur kaisi dikhti hai — dono bataiye. Sirf ginti se AI aksar bagal wala utha leta hai."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cheez" htmlFor="shot">
            <Select id="shot" value={shotKey} onChange={(e) => setShotKey(e.target.value)}>
              {SHOT_TYPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Dhaatu"
            htmlFor="metal"
            hint="Tray par 750 likha ho to 18K wala chuniye."
          >
            <Select
              id="metal"
              value={metalLabel}
              onChange={(e) => setMetalLabel(e.target.value)}
            >
              {metals.map((m) => (
                <option key={m.id} value={m.label}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-end gap-5">
          {needsRow && (
            <Field label="Row (upar se)" htmlFor="row">
              <Input
                id="row"
                type="number"
                min={1}
                inputMode="numeric"
                numeric
                width="auto"
                className="w-24"
                value={row}
                onChange={(e) => setRow(e.target.value)}
              />
            </Field>
          )}

          {needsPiece && (
            <Field
              label={shot.address === 'sequence' ? 'Kaunsa (upar se)' : 'Kaunsa (baayein se)'}
              htmlFor="piece"
            >
              <Input
                id="piece"
                type="number"
                min={1}
                inputMode="numeric"
                numeric
                width="auto"
                className="w-24"
                value={piece}
                onChange={(e) => setPiece(e.target.value)}
              />
            </Field>
          )}

          {needsLayer && (
            <Field label="Kaunsa haar" htmlFor="layer">
              <Select
                id="layer"
                width="auto"
                className="w-56"
                value={layer}
                onChange={(e) => setLayer(e.target.value as LayerKey)}
              >
                <option value="outer">Bahar wala, lamba</option>
                <option value="inner">Beech wala, chhota</option>
              </Select>
            </Field>
          )}
        </div>

        <Field
          label="Pehchan — English me"
          htmlFor="mark"
          hint="Aisi ek baat jo bagal wale piece me nahi hai. Jaise: a crescent with a teardrop below, ya a round flower medallion inside a heart-shaped fan."
        >
          <Textarea
            id="mark"
            rows={2}
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            placeholder="a crescent with a teardrop hanging below"
          />
        </Field>
      </CardFieldset>

      <PromptCard
        step="1"
        title="Main photo"
        hint="Tray wali photo ke saath dijiye."
        text={prompts.main}
      />
      <PromptCard
        step="2"
        title="Zoom"
        hint="1 se mili saaf photo ke saath dijiye."
        text={prompts.zoom}
      />
      <PromptCard
        step="3"
        title="Pehne hue"
        hint="1 se mili saaf photo ke saath dijiye."
        text={prompts.worn}
      />
      <PromptCard
        title="Negative prompt"
        hint="Teeno ke saath yahi lagaiye, jahan AI me negative ka box ho."
        text={prompts.negative}
        rows={4}
      />
    </div>
  );
}

function PromptCard({
  step,
  title,
  hint,
  text,
  rows = 16,
}: {
  step?: string;
  title: string;
  hint: string;
  text: string;
  rows?: number;
}) {
  return (
    <Card className="px-6 pb-6 pt-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg text-ink">
            {step ? `${step}. ${title}` : title}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>
        </div>
        <CopyButton text={text} label={`${title} copy karein`} />
      </div>

      <Textarea
        readOnly
        rows={rows}
        value={text}
        aria-label={title}
        className="mt-4 bg-surface-sunk font-mono text-sm"
      />
    </Card>
  );
}

/**
 * Confirmation matters more than usual here: the shop copies four of these in a
 * row and has no other way to tell which one is on the clipboard.
 */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused — over plain http on the shop's LAN,
      // for instance. Selecting the box by hand still works, so say that
      // rather than failing silently.
      window.alert('Copy nahi ho paya. Neeche ke box me se khud select karke copy kar lijiye.');
    }
  }

  return (
    <Button
      type="button"
      intent={copied ? 'secondary' : 'primary'}
      onClick={copy}
      aria-label={label}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? 'Copy ho gaya' : 'Copy'}
    </Button>
  );
}
