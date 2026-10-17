import { generateIdea, seededRandom } from './ideaEngine.js';
import { normalizeJam } from './jamPolicy.js';
import { findSmartIdea, SMART_ROLL_CONFIG } from './smartRoll.js';
import { SCORING_CONFIG } from './scoringConfig.js';
import { explainIdea } from './scoreExplanations.js';

// Increment when changing seeded search, scoring weights or rules.
export const SMART_GENERATION_VERSION = 1;

// Browser-independent smart generation; callers handle catalog I/O and localization.
export async function generateSmartIdea(options) {
  const { catalog, seed } = options;
  for (const key of SCORING_CONFIG.categories) {
    const values = catalog?.categories?.[key];
    if (!Array.isArray(values) || values.some(option => !option ||
      !Array.isArray(option.tags) || !option.tags.length || option.tags.some(tag => typeof tag !== 'string') ||
      !Array.isArray(option.contrasts) || option.contrasts.some(tag => typeof tag !== 'string') ||
      !Number.isFinite(option.commonness) || option.commonness < 0 || option.commonness > 1 ||
      (option.conflicts !== undefined && (!Array.isArray(option.conflicts) || option.conflicts.some(tag => typeof tag !== 'string'))))) {
      throw new TypeError(`Smart generation requires scoring metadata for ${key}; rebuild or use an updated catalog`);
    }
  }
  const baseline = generateIdea(options);
  // Preserve deterministic replay even if an otherwise identical catalog is reordered.
  const orderedCatalog = { ...catalog, categories: Object.fromEntries(Object.entries(catalog.categories)
    .map(([key, values]) => [key, [...values].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)])) };
  const state = Object.fromEntries(Object.entries(baseline.categories).map(([key, values]) => [key, {
    values:values.map(value => value.text), ids:values.map(value => value.id),
    count:values.length, locked:false, excluded:false
  }]));
  const result = await findSmartIdea({state, catalog:orderedCatalog, jam:normalizeJam(options.jam),
    random:seededRandom(`smart:${SMART_GENERATION_VERSION}:${seed}`)});
  const categories = Object.fromEntries(Object.entries(result.idea.categories).map(([key, values]) =>
    [key, values.map(option => ({id:option.id, text:option.text,
      ...(option.tags ? {tags:[...option.tags], contrasts:[...option.contrasts], commonness:option.commonness,
        ...(option.conflicts ? {conflicts:[...option.conflicts]} : {})} : {})}))]));
  return { ...baseline, categories, scores:result.scores, explanations:explainIdea(result.idea),
    smart: {version:SMART_GENERATION_VERSION, candidateCount:SMART_ROLL_CONFIG.candidateCount,
      topCount:SMART_ROLL_CONFIG.topCount, evaluated:result.evaluated, changed:result.changed, reason:result.reason} };
}
