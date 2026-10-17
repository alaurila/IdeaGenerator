// Pure generation: no DOM, storage, network or shared application state.
import { CATEGORIES } from './config.js';

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

export function generateIdea({ catalog, language, seed }) {
  if (typeof language !== 'string' || typeof seed !== 'string') {
    throw new TypeError('language and seed must be strings');
  }
  const random = seededRandom(seed);
  if (catalog?.schemaVersion !== SCHEMA_VERSION || typeof catalog.catalogVersion !== 'string' ||
      catalog.language !== language) {
    throw new TypeError('Unsupported catalog version or language');
  }
  const categories = Object.fromEntries(CATEGORIES.map(category => {
    const values = catalog.categories?.[category.key];
    if (!Array.isArray(values) || !values.length || values.some(v =>
      !v || typeof v.id !== 'string' || !v.id || typeof v.text !== 'string' || !v.text.trim()) ||
      new Set(values.map(v => v.id)).size !== values.length) {
      throw new TypeError(`Missing or invalid catalog category: ${category.key}`);
    }
    const count = category.multi ? (category.defaultCount ?? 1) : 1;
    // Sorting IDs makes source file reordering irrelevant to seeded results.
    const ordered = [...values].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return [category.key, pickUnique(ordered, count, [], random).map(value => ({ ...value }))];
  }));
  return { schemaVersion: SCHEMA_VERSION, generatorVersion: GENERATOR_VERSION,
    catalogVersion: catalog.catalogVersion, language, seed, categories };
}
