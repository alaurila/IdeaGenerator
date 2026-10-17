// Pure generation: no DOM, storage, network or shared application state.
import { CATEGORIES, MIN_COUNT, MAX_COUNT } from './config.js';
import { normalizeJam, jamSelectionOptions, resolveJamTheme, JAM_POLICY_VERSION } from './jamPolicy.js';

export const SCHEMA_VERSION = 2;
export const GENERATOR_VERSION = 1;

export function collectOptions(node, out = []) {
  if (node && typeof node.id === 'string' && typeof node.text === 'string') {
    out.push({ id: node.id, text: node.text.trim() });
  } else if (Array.isArray(node)) {
    node.forEach(item => collectOptions(item, out));
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach(item => collectOptions(item, out));
  } else {
    throw new TypeError('Catalog options must be { id, text } records');
  }
  return out;
}

export function translateSelections(values, previous, next) {
  const byText = new Map(previous.map(option => [option.text, option.id]));
  const byId = new Map(next.map(option => [option.id, option.text]));
  return [...new Set(values.map(text => byId.get(byText.get(text))).filter(Boolean))];
}

export function collectStrings(node, out = []) {
  if (node && typeof node.id === 'string' && typeof node.text === 'string') {
    if (node.text.trim()) out.push(node.text.trim());
  } else if (typeof node === 'string') {
    if (node.trim()) out.push(node.trim());
  } else if (Array.isArray(node)) {
    node.forEach(item => collectStrings(item, out));
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach(item => collectStrings(item, out));
  }
  return out;
}

export function seededRandom(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  }
  return () => {
    hash += 0x6D2B79F5;
    let value = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickUnique(list, count, avoid = [], random = Math.random) {
  const unique = [...new Set(list)];
  const avoided = new Set(avoid);
  let pool = unique.filter(value => !avoided.has(value));
  if (pool.length < count) pool = unique;
  const picked = [];
  while (picked.length < count && pool.length) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return picked;
}

export function generateIdea({ catalog, language, seed, jam: jamInput, counts = {} }) {
  if (typeof language !== 'string' || typeof seed !== 'string') {
    throw new TypeError('language and seed must be strings');
  }
  const random = seededRandom(seed);
  if (catalog?.schemaVersion !== SCHEMA_VERSION || typeof catalog.catalogVersion !== 'string' ||
      catalog.language !== language) {
    throw new TypeError('Unsupported catalog version or language');
  }
  const jam = normalizeJam(jamInput);
  if (jam.enabled && catalog.jam?.policyVersion !== JAM_POLICY_VERSION) throw new TypeError('Unsupported game jam catalog');
  const categories = Object.fromEntries(CATEGORIES.map(category => {
    const values = catalog.categories?.[category.key];
    if (!Array.isArray(values) || !values.length || values.some(v =>
      !v || typeof v.id !== 'string' || !v.id || typeof v.text !== 'string' || !v.text.trim()) ||
      new Set(values.map(v => v.id)).size !== values.length) {
      throw new TypeError(`Missing or invalid catalog category: ${category.key}`);
    }
    const count = counts[category.key] ?? (category.multi ? (category.defaultCount ?? 1) : 1);
    if (!Number.isInteger(count) || count < MIN_COUNT || count > (category.multi ? MAX_COUNT : 1)) {
      throw new TypeError(`Invalid count: ${category.key}`);
    }
    // Sorting IDs makes source file reordering irrelevant to seeded results.
    const ordered = [...jamSelectionOptions(catalog, category.key, jam, count)].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return [category.key, pickUnique(ordered, count, [], random).map(option => ({
      id: option.id, text: option.text,
      ...(option.tags ? { tags: [...option.tags], contrasts: [...option.contrasts], commonness: option.commonness,
        ...(option.conflicts ? { conflicts: [...option.conflicts] } : {}) } : {})
    }))];
  }));
  return { schemaVersion: SCHEMA_VERSION, generatorVersion: GENERATOR_VERSION,
    catalogVersion: catalog.catalogVersion, language, seed, categories,
    ...(jam.enabled ? { jam: { ...jam, policyVersion: JAM_POLICY_VERSION,
      theme: resolveJamTheme(jam, catalog.jam.themes, seededRandom(`theme:${seed}`)) } } : {}) };
}
