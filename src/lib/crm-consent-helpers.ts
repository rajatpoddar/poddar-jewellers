export interface MarketingConsentPayload {
  marketingOptIn: boolean;
  optInSource: string | null;
  optInAt: Date | null;
}

export function updateMarketingConsentLogic(
  optIn: boolean,
  source: string
): MarketingConsentPayload {
  return {
    marketingOptIn: optIn,
    optInSource: optIn ? source : null,
    optInAt: optIn ? new Date() : null,
  };
}
