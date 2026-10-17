import { SCORING_CONFIG } from './scoringConfig.js';

export const clampScore = value => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

export function buildScoringIdea(state, catalog) {
  return { categories: Object.fromEntries(SCORING_CONFIG.categories.map(key => {
    const entry = state[key];
    const options = catalog?.categories?.[key] ?? [];
    return [key, !entry || entry.excluded ? [] : entry.values.map((text, index) =>
      options.find(v => v.id === entry.ids?.[index] && v.text === text) ?? options.find(v => v.text === text)).filter(Boolean)];
  })) };
}

export function scoringGroups(idea, config = SCORING_CONFIG) {
  return Object.fromEntries(config.categories.map(key => {
    const seen = new Set();
    const options = (idea?.categories?.[key] ?? []).filter(option => {
      if (!option || !Array.isArray(option.tags) || !option.tags.length) return false;
      const id = option.id ?? JSON.stringify(option);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return [key, options];
  }));
}

export function scoringPairs(idea, config = SCORING_CONFIG) {
  const groups = scoringGroups(idea, config);
  const pairs = [];
  for (const { left, right, weight } of config.pairs) {
    if (!(weight > 0) || !groups[left]?.length || !groups[right]?.length) continue;
    // Average within a category pair: extra selected values cannot simply stack points.
    const perPair = weight / (groups[left].length * groups[right].length);
    for (const a of groups[left]) for (const b of groups[right]) pairs.push({ a, b, weight: perPair, left, right });
  }
  return pairs;
}

export function synergyEvidence(a, b, config = SCORING_CONFIG) {
  const left = new Set(a.tags);
  const right = new Set(b.tags);
  const shared = [...left].filter(tag => right.has(tag));
  const supporting = config.supportPairs.filter(([x, y]) =>
    (left.has(x) && right.has(y)) || (left.has(y) && right.has(x)));
  const strength = (shared.length + supporting.length * config.supportStrength) / Math.sqrt(left.size * right.size);
  return { shared, supporting, strength: Math.min(1, strength) };
}

export function contrastEvidence(a, b) {
  const left = [...new Set(a.contrasts ?? [])];
  const right = [...new Set(b.contrasts ?? [])];
  const matches = [...new Set([...left.filter(tag => b.tags.includes(tag)),
    ...right.filter(tag => a.tags.includes(tag))])];
  const hits = left.filter(tag => b.tags.includes(tag)).length + right.filter(tag => a.tags.includes(tag)).length;
  return { matches, strength: hits / Math.max(1, left.length + right.length) };
}

export function findConflicts(idea, config = SCORING_CONFIG) {
  const groups = scoringGroups(idea, config);
  const matches = [];
  for (const [key, options] of Object.entries(groups)) {
    for (const source of options) {
      for (const tag of new Set(source.conflicts ?? [])) {
        const target = Object.entries(groups).filter(([other]) => other !== key)
          .flatMap(([, values]) => values).find(option => option.tags.includes(tag));
        if (target) matches.push({ source, target, tag });
      }
    }
  }
  return matches;
}

export function totalScore(scores, config = SCORING_CONFIG) {
  const weights = config.totalWeights;
  return Math.round(clampScore(clampScore(scores.synergy) * weights.synergy +
    clampScore(scores.tension) * weights.tension + clampScore(scores.novelty) * weights.novelty -
    clampScore(scores.conflict) * weights.conflict));
}

export function scoreIdea(idea, config = SCORING_CONFIG) {
  const pairs = scoringPairs(idea, config);
  const weight = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  const synergy = weight ? 100 * pairs.reduce((sum, pair) =>
    sum + pair.weight * synergyEvidence(pair.a, pair.b, config).strength, 0) / weight : 0;
  const tension = weight ? 100 * pairs.reduce((sum, pair) =>
    sum + pair.weight * contrastEvidence(pair.a, pair.b).strength, 0) / weight : 0;
  const commonness = Object.values(scoringGroups(idea, config)).flat()
    .map(option => option.commonness)
    .filter(value => Number.isFinite(value) && value >= 0 && value <= 1);
  const novelty = commonness.length ? 100 * (1 - commonness.reduce((sum, value) => sum + value, 0) / commonness.length) : 0;
  const conflict = Math.min(config.conflict.maximum, findConflicts(idea, config).length * config.conflict.perRule);
  const scores = { synergy: Math.round(clampScore(synergy)), tension: Math.round(clampScore(tension)),
    novelty: Math.round(clampScore(novelty)), conflict: Math.round(clampScore(conflict)) };
  return { ...scores, total: totalScore(scores, config) };
}
