// Initial design weights, intentionally centralized for later tuning.
export const SCORING_CONFIG = {
  categories: ['genres', 'settings', 'core_mechanics', 'moods', 'twists'],
  pairs: [
    { left: 'genres', right: 'core_mechanics', weight: 3 },
    { left: 'genres', right: 'settings', weight: 1 },
    { left: 'genres', right: 'moods', weight: 1 },
    { left: 'settings', right: 'twists', weight: 2 },
    { left: 'core_mechanics', right: 'twists', weight: 2 },
    { left: 'core_mechanics', right: 'moods', weight: 1 }
  ],
  supportPairs: [
    ['management','systems'], ['management','information'], ['people','social'],
    ['investigation','information'], ['mystery','investigation'], ['construction','crafting'],
    ['economy','management'], ['technology','systems'], ['nature','exploration'],
    ['survival','scarcity'], ['competition','strategy'], ['narrative','identity']
  ],
  supportStrength: 0.2,
  conflict: { perRule: 12, maximum: 30 },
  totalWeights: { synergy: 0.35, tension: 0.30, novelty: 0.35, conflict: 0.50 }
};
