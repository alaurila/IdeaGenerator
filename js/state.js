// Generaattorin koko tila yhdessä objektissa + tallennus localStorageen.

import { CATEGORIES, MIN_COUNT, MAX_COUNT } from './config.js';
import { lists } from './dataLoader.js';

const STORAGE_KEY = 'gameIdeaGenerator.state.v1';

// { genres: { values: [], locked: false, count: 2 }, ... }
export const state = {};

const listeners = [];

export function subscribe(listener) {
  listeners.push(listener);
}

// Kutsutaan aina tilan muuttamisen jälkeen: tallentaa ja päivittää UI:n.
export function commit(changedKeys = []) {
  save();
  listeners.forEach(listener => listener(changedKeys));
}

function clampCount(n) {
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, Number(n) || MIN_COUNT));
}

export function initState() {
  CATEGORIES.forEach(category => {
    state[category.key] = {
      values: [],
      locked: false,
      excluded: false, // pois jätetty kenttä ei arvota eikä näy promptissa
      count: category.multi ? (category.defaultCount ?? 1) : 1
    };
  });
  return restore();
}

// Palauttaa true, jos tallennettu tila löytyi.
function restore() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
  if (!saved || typeof saved !== 'object') return false;

  CATEGORIES.forEach(category => {
    const entry = saved[category.key];
    if (!entry) return;
    const known = new Set(lists[category.key]);
    const target = state[category.key];

    if (category.multi) target.count = clampCount(entry.count);
    target.locked = Boolean(entry.locked);
    target.excluded = Boolean(entry.excluded);
    if (Array.isArray(entry.values)) {
      target.values = [...new Set(entry.values)]
        .filter(v => known.has(v))
        .slice(0, target.count);
    }
  });
  return true;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Tallennus ei ole kriittinen (esim. yksityinen selausikkuna).
  }
}
