import type { BusinessCategory, KeywordReplyRule } from '@/types/database';
import { getIndustryTemplatePack, industryTemplatePacks } from '@/lib/industry-templates';

type StarterRules = { rules: KeywordReplyRule[]; fallback: string };

export const starterKeywordRules: Record<BusinessCategory, StarterRules> = {
  real_estate: getStarterKeywordRules('real_estate'),
  clinic: getStarterKeywordRules('clinic'),
  coaching: getStarterKeywordRules('coaching'),
  gym: getStarterKeywordRules('gym'),
  local_service: getStarterKeywordRules('local_service'),
  other: getStarterKeywordRules('other'),
};

export { industryTemplatePacks };

export function getStarterKeywordRules(category: BusinessCategory): StarterRules {
  const pack = getIndustryTemplatePack(category);
  return { rules: pack.rules, fallback: pack.fallback };
}
