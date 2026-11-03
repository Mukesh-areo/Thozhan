import tamilNadu from '../rules/tamil-nadu.json' with { type: 'json' };
import type { TariffRule } from './types.ts';

const STATUSES = new Set(['OFFICIAL', 'PENDING_APPROVAL', 'ILLUSTRATIVE']);
const SERVICES = new Set(['auto', 'bike', 'cab', 'parcel']);
const ROUNDINGS = new Set(['nearest-rupee', 'ceil-rupee', 'none']);

const isPaise = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;

/** Returns a list of problems; empty means the rule is structurally valid. */
export function validateRule(rule: TariffRule): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, msg: string) => ok || errors.push(`${rule.id ?? '?'}: ${msg}`);
  check(typeof rule.id === 'string' && rule.id.length > 0, 'id required');
  check(Number.isInteger(rule.version) && rule.version > 0, 'version must be a positive integer');
  check(SERVICES.has(rule.service), `unknown service ${rule.service}`);
  check(STATUSES.has(rule.status), `unknown status ${rule.status}`);
  check(ROUNDINGS.has(rule.rounding), `unknown rounding ${rule.rounding}`);
  check(rule.status !== 'OFFICIAL' || !!rule.legalReference, 'OFFICIAL rule needs legalReference');
  check(rule.status !== 'OFFICIAL' || !!rule.effectiveFrom, 'OFFICIAL rule needs effectiveFrom');
  for (const [name, band] of [['plain', rule.plain], ['ghat', rule.ghat]] as const) {
    if (!band) continue;
    check(isPaise(band.baseFarePaise) && isPaise(band.perKmPaise) && isPaise(band.baseDistanceMeters), `${name} band must be non-negative integers`);
  }
  check(!!rule.plain, 'plain band required');
  check(isPaise(rule.waiting?.perMinutePaise) && (rule.waiting?.freeMinutes ?? -1) >= 0, 'waiting invalid');
  if (rule.night) check(rule.night.multiplierPermille >= 1000, 'night multiplier must be >= 1000');
  check(rule.service !== 'parcel' || rule.maxWeightGrams !== undefined, 'parcel rule needs maxWeightGrams');
  return errors;
}

export const TARIFF_RULES: readonly TariffRule[] = Object.freeze(tamilNadu as TariffRule[]);

{
  const problems = TARIFF_RULES.flatMap(validateRule);
  if (problems.length) throw new Error(`Invalid tariff data:\n${problems.join('\n')}`);
}

/**
 * Highest version of a category in force at `at` (IST date). Rules with no effectiveFrom
 * (illustrative drafts) are returned only when no dated rule applies.
 */
export function getActiveRule(category: string, at: Date = new Date(), rules: readonly TariffRule[] = TARIFF_RULES): TariffRule {
  const day = new Date(at.getTime() + 330 * 60000).toISOString().slice(0, 10);
  const candidates = rules.filter((r) => r.category === category);
  const dated = candidates
    .filter((r) => r.effectiveFrom && r.effectiveFrom <= day && (!r.effectiveTo || day < r.effectiveTo))
    .sort((a, b) => b.version - a.version);
  const rule = dated[0] ?? candidates.filter((r) => !r.effectiveFrom).sort((a, b) => b.version - a.version)[0];
  if (!rule) throw new RangeError(`No tariff for category ${category} on ${day}`);
  return rule;
}
