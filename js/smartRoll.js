import { CATEGORIES } from './config.js';
import { pickUnique } from './ideaEngine.js';
import { jamSelectionOptions } from './jamPolicy.js';
import { scoreIdea } from './scoring.js';
import { SCORING_CONFIG } from './scoringConfig.js';

export const SMART_ROLL_CONFIG = { candidateCount: 500, topCount: 10, batchSize: 25 };

function fingerprint(idea) {
  return JSON.stringify(SCORING_CONFIG.categories.map(key => (idea.categories[key] ?? []).map(v => v.id).sort()));
}

export function createCandidateFactory({ state, catalog, jam, random = Math.random }) {
  const baseline = { categories: {} };
  const pools = {};
  const editable = [];
  for (const { key } of CATEGORIES) {
    const entry = state[key];
    const options = catalog.categories[key];
    const selected = entry.values.map((text, index) =>
      options.find(v => v.id === entry.ids?.[index] && v.text === text) ?? options.find(v => v.text === text));
    if (selected.some(v => !v)) throw new TypeError(`Unknown selected option: ${key}`);
    baseline.categories[key] = entry.excluded ? [] : selected;
    if (entry.locked || entry.excluded) continue;
    let pool = [...new Map(jamSelectionOptions(catalog, key, jam, entry.count).map(v => [v.text,v])).values()];
    if (pool.length < entry.count) {
      pool = [...new Map([...pool,...options].map(v => [v.text,v])).values()];
    }
    if (pool.length < entry.count) throw new TypeError(`Not enough distinct options: ${key}`);
    const previous = new Set(entry.values);
    const fresh = pool.filter(v => !previous.has(v.text));
    pools[key] = fresh.length >= entry.count ? fresh : pool;
    editable.push(key);
  }
  return {
    baseline,
    hasEditableScore: editable.some(key => SCORING_CONFIG.categories.includes(key) && pools[key].some(v => v.tags?.length)),
    next: () => ({ categories: Object.fromEntries(CATEGORIES.map(({key}) => [key,
      pools[key] ? pickUnique(pools[key], state[key].count, [], random) : baseline.categories[key]])) })
  };
}

// Pure search apart from cooperative yielding. Callers own UI/state application.
export async function findSmartIdea({ state, catalog, jam, random = Math.random,
  candidateCount = SMART_ROLL_CONFIG.candidateCount, topCount = SMART_ROLL_CONFIG.topCount,
  batchSize = SMART_ROLL_CONFIG.batchSize, signal, onProgress = () => {} }) {
  if (!Number.isInteger(candidateCount) || candidateCount < 1 || candidateCount > 1000 ||
      !Number.isInteger(topCount) || topCount < 1 || topCount > 100 ||
      !Number.isInteger(batchSize) || batchSize < 1) throw new TypeError('Invalid smart search configuration');
  const factory = createCandidateFactory({state,catalog,jam,random});
  const baselineScore = scoreIdea(factory.baseline);
  const initial = { idea: factory.baseline, scores: baselineScore, evaluated:0, changed:false, finalists:[] };
  if (!factory.hasEditableScore) return {...initial, reason:'noEditable'};
  const seen = new Set([fingerprint(factory.baseline)]);
  const best = [];
  for (let index = 0; index < candidateCount; index++) {
    if (signal?.aborted) throw new DOMException('Smart search canceled', 'AbortError');
    const candidate = factory.next();
    const key = fingerprint(candidate);
    if (!seen.has(key)) {
      seen.add(key);
      const scores = scoreIdea(candidate);
      if (scores.total >= baselineScore.total) {
        best.push({idea:candidate,scores});
        best.sort((a,b) => b.scores.total - a.scores.total);
        if (best.length > topCount) best.pop();
      }
    }
    if ((index + 1) % batchSize === 0 || index + 1 === candidateCount) {
      onProgress(index + 1, candidateCount);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  if (signal?.aborted) throw new DOMException('Smart search canceled', 'AbortError');
  if (!best.length) return {...initial, evaluated:candidateCount, reason:'noImprovement'};
  // Uniform choice within the top shortlist, rather than always choosing its first item.
  const chosen = best[Math.floor(random() * best.length)];
  return { idea: structuredClone(chosen.idea), scores:chosen.scores, evaluated:candidateCount,
    changed:true, finalists:best.map(v => v.scores), reason:'selected' };
}
