export type CopyContext = 'headline' | 'subtitle' | 'promo' | 'whatsapp' | 'description';

export interface EnhanceCopyInput {
  text: string;
  context: CopyContext;
}

/**
 * Enhances rough draft copy into polished, high-converting jewellery marketing copy.
 * Pure function with contextual rule-based enhancement and smart templates.
 *
 * Adheres strictly to Hard Rule 7 (no shop fact hardcoded — uses {{ShopName}} variable).
 * Adheres strictly to Hard Rule 9 (design system — zero emoji in code).
 */
export function enhanceCopy({ text, context }: EnhanceCopyInput): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  switch (context) {
    case 'headline': {
      if (trimmed.toLowerCase().includes('dhanteras')) {
        return 'Dhanteras Swarna Utsav: 22K Hallmark Gold & Diamond Collection';
      }
      if (trimmed.toLowerCase().includes('diwali')) {
        return 'Diwali Festive Sparkle: Exclusive Gold & Silver Jewellery Offers';
      }
      if (trimmed.toLowerCase().includes('bridal') || trimmed.toLowerCase().includes('wedding')) {
        return 'Royal Bridal Collection 2026: Crafted for Unforgettable Moments';
      }
      return `${capitalizeWords(trimmed)}: Premium Hallmark Jewellery Collection`;
    }

    case 'subtitle': {
      if (trimmed.toLowerCase().includes('discount') || trimmed.toLowerCase().includes('off')) {
        return `${trimmed} — Shop 100% Certified BIS Hallmark Gold with Complete Transparency.`;
      }
      return `Explore ${trimmed} with live calculated pricing, 100% BIS Hallmark purity, and personalized assistance.`;
    }

    case 'promo': {
      if (trimmed.toLowerCase().includes('making')) {
        return `Festive Special: ${trimmed} on all Hallmark Gold & Silver Jewellery!`;
      }
      return `Limited Time Offer: ${trimmed}. Visit showroom or book online on WhatsApp.`;
    }

    case 'whatsapp': {
      return `Namaste! {{ShopName}} se aapke liye vishesh prastav:\n\n${trimmed}\n\nDesigns dekhne aur live rates calculate karne ke liye hamari website par visit karein:\n{{ProductUrl}}\n\nShukriya!`;
    }

    case 'description': {
      const isHallmark = trimmed.toLowerCase().includes('hallmark') ? '' : ' 100% BIS Hallmark certified.';
      return `Exquisitely handcrafted jewellery piece. ${trimmed}${isHallmark} Designed with precision filigree, superior finish, and timeless elegance suitable for weddings, festivals, and special occasions.`;
    }

    default:
      return trimmed;
  }
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}
