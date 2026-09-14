import { getShop, getMetalTypes } from '@/lib/shop';
import { PageHeader } from '@/components/ui/Surface';
import { Notice } from '@/components/ui/Notice';
import { PromptStudio } from './studio';

export const dynamic = 'force-dynamic';

/**
 * Everything the prompts need that differs between shops is read here and
 * handed down: the background colour comes from the shop's branding and the
 * metal names from its own `MetalType` rows. The prompt text itself knows
 * neither. See `src/lib/ai-prompts.ts` and D16.
 */
export default async function PhotoPromptsPage() {
  const shop = await getShop();
  const metals = await getMetalTypes();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Photo prompts"
        description="Supplier ki tray photo se ek product ke teen photos banwaiye. Neeche se prompt copy kijiye aur AI ko tray photo ke saath dijiye."
      />

      <Notice tone="info">
        <strong>Pehle 1 chalaiye.</strong> Usse ek saaf photo milegi — wahi main
        photo hai. Uske baad 2 aur 3 me <strong>wahi saaf photo</strong> upload
        kijiye, tray wali dobara nahi. Tray dobara denge to AI har baar design
        thoda badal dega.
      </Notice>

      <PromptStudio
        metals={metals.map((m) => ({ id: m.id, label: m.label }))}
        ground={shop.brandGround}
      />
    </div>
  );
}
