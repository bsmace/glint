export type Tier = 'free' | 'pro';

export type Feature = 'customChips' | 'brandVoice' | 'teamSync' | 'abTesting';

const FEATURE_TIER: Record<Feature, Tier> = {
  customChips: 'pro',
  brandVoice: 'pro',
  teamSync: 'pro',
  abTesting: 'pro',
};

export function isFeatureAvailable(feature: Feature, tier: Tier): boolean {
  if (tier === 'pro') return true;
  return FEATURE_TIER[feature] === 'free';
}

export function getMaxCustomChips(tier: Tier): number {
  return tier === 'pro' ? 5 : 0;
}
