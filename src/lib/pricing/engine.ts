import { applyPercentBp, roundUpPaise } from '../money';
import { calculateEffectiveMakingBp } from './making';
import type { PriceBreakdown, PriceInput, RateSet, RoundingConfig } from './types';

/**
 * The one function that decides what a customer is quoted.
 *
 * Pure: no database, no clock, no framework. Everything it needs arrives as an
 * argument, which is what makes it exhaustively testable.
 *
 *   metal    = weight x rate for the product's metal type
 *   making   = metal x makingPercent          (metal only — never the stone)
 *   stone    = fixed, does not scale with weight
 *   subtotal = metal + making + stone
 *   gst      = subtotal x gstPercent
 *   display  = subtotal + gst, rounded UP
 */
export function estimate(
  input: PriceInput,
  rates: RateSet,
  gstPercentBp: number,
  rounding: RoundingConfig,
): PriceBreakdown {
  if (!Number.isInteger(input.weightMg) || input.weightMg <= 0) {
    throw new Error(`estimate: weight must be a positive integer in milligrams, got ${input.weightMg}`);
  }

  // `hasOwnProperty`, not a truthiness check: rates is a plain record keyed by
  // shop-defined strings, and a key like "toString" would otherwise resolve to
  // an inherited function rather than a rate.
  const hasRate = Object.prototype.hasOwnProperty.call(rates, input.metalKey);
  const ratePaisePerGram = hasRate ? rates[input.metalKey] : undefined;

  if (
    typeof ratePaisePerGram !== 'number' ||
    !Number.isInteger(ratePaisePerGram) ||
    ratePaisePerGram <= 0
  ) {
    throw new Error(`estimate: today's rates carry no usable line for metal type "${input.metalKey}"`);
  }

  const metalPaise = Math.round((input.weightMg * ratePaisePerGram) / 1000);
  const effectiveMakingBp = calculateEffectiveMakingBp(input.makingPercentBp, input.promotionDiscountBp);
  const makingPaise = applyPercentBp(metalPaise, effectiveMakingBp);
  const stonePaise = input.stoneValuePaise;

  const subtotalPaise = metalPaise + makingPaise + stonePaise;
  const gstPaise = applyPercentBp(subtotalPaise, gstPercentBp);
  const totalPaise = subtotalPaise + gstPaise;

  const step = totalPaise >= rounding.thresholdPaise ? rounding.stepPaise : rounding.smallStepPaise;
  const displayPaise = roundUpPaise(totalPaise, step);

  let originalTotalPaise: number | undefined;
  let hasDiscount = false;
  let discountAmountPaise = 0;

  if (
    input.promotionDiscountBp !== undefined &&
    input.promotionDiscountBp > 0 &&
    effectiveMakingBp < input.makingPercentBp
  ) {
    const baseMakingPaise = applyPercentBp(metalPaise, input.makingPercentBp);
    const baseSubtotalPaise = metalPaise + baseMakingPaise + stonePaise;
    const baseGstPaise = applyPercentBp(baseSubtotalPaise, gstPercentBp);
    const baseTotalPaise = baseSubtotalPaise + baseGstPaise;
    const baseStep = baseTotalPaise >= rounding.thresholdPaise ? rounding.stepPaise : rounding.smallStepPaise;
    const baseDisplayPaise = roundUpPaise(baseTotalPaise, baseStep);

    if (baseDisplayPaise > displayPaise) {
      hasDiscount = true;
      originalTotalPaise = baseDisplayPaise;
      discountAmountPaise = baseDisplayPaise - displayPaise;
    }
  }

  return {
    metalPaise,
    makingPaise,
    stonePaise,
    subtotalPaise,
    gstPaise,
    totalPaise,
    displayPaise,
    originalTotalPaise,
    hasDiscount,
    discountAmountPaise,
  };
}
