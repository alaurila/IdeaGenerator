// Arvontalogiikka. Kaikki funktiot muokkaavat statea ja kutsuvat commit().

import { CATEGORIES, CATEGORY_BY_KEY, MIN_COUNT, MAX_COUNT } from './config.js';
import { lists, catalog } from './dataLoader.js';
import { state, commit } from './state.js';
import { generateIdea, pickUnique, translateSelections } from './ideaEngine.js';
import { currentLanguage } from './i18n.js';
import { jam, rollJamTheme, acceptJamIdea } from './jamState.js';
import { jamSelectionOptions } from './jamPolicy.js';

// Palauttaa true, jos kenttä arvottiin (lukittua tai pois jätettyä ei arvota).
function rollInto(key) {
  const entry = state[key];
  if (entry.locked || entry.excluded) return false;
  const pool = jamSelectionOptions(catalog, key, jam, entry.count).map(v => v.text);
  entry.values = pickUnique(pool, entry.count, entry.values);
  return true;
}

export function rollCategory(key) {
  if (rollInto(key)) commit([key]);
}

export function rollAll() {
  if (jam.enabled) rollJamTheme(catalog);
  const rolled = CATEGORIES.map(c => c.key).filter(rollInto);
  commit(rolled);
}

// Match translations by permanent IDs, independent of source list order.
export function translateValues(oldCatalog) {
  CATEGORIES.forEach(({ key }) => {
    const newList = lists[key];
    const entry = state[key];
    const byId = new Map(catalog.categories[key].map(v => [v.id, v.text]));
    if (entry.ids?.length === entry.values.length) {
      entry.ids = entry.ids.filter(id => byId.has(id));
      entry.values = entry.ids.map(id => byId.get(id));
    } else {
      entry.values = translateSelections(entry.values,
        oldCatalog.categories[key], catalog.categories[key]);
    }
    if (entry.values.length < entry.count && !entry.excluded) {
      const extra = pickUnique(newList.filter(v => !entry.values.includes(v)), entry.count - entry.values.length);
      entry.values = [...entry.values, ...extra];
    }
  });
  commit();
}

// Täyttää vajaat kentät tallennetun tilan palautuksen jälkeen.
export function fillMissing() {
  const filled = CATEGORIES
    .map(c => c.key)
    .filter(key => state[key].values.length < state[key].count)
    .filter(rollInto);
  if (filled.length) commit(filled);
}

function applyIdea(idea) {
  acceptJamIdea(idea);
  CATEGORIES.forEach(({ key }) => {
    const values = idea.categories[key].map(option => option.text);
    Object.assign(state[key], { values, ids: idea.categories[key].map(option => option.id),
      count: values.length, locked: false, excluded: false });
  });
}

// A fresh idea is reproducible from its language and seed, independent of storage.
export function newIdea(seed = crypto.randomUUID()) {
  const idea = generateIdea({ catalog, language: currentLanguage, seed, jam });
  applyIdea(idea);
  commit(CATEGORIES.map(c => c.key));
  return idea;
}

// Demonstrate locks and exclusions without changing the pure generator's output.
export function exampleIdea() {
  const counts = Object.fromEntries(CATEGORIES.map(c => [c.key, state[c.key].count]));
  applyIdea(generateIdea({ catalog, language: currentLanguage, seed: crypto.randomUUID(), jam, counts }));
  const locked = pickUnique(CATEGORIES.map(c => c.key), 2 + Math.floor(Math.random() * 2));
  locked.forEach(key => { state[key].locked = true; });
  // Keep the three introductory fields populated so the example remains readable.
  const candidates = CATEGORIES.map(c => c.key)
    .filter(key => !locked.includes(key) && !['genres', 'main_goals', 'twists'].includes(key));
  pickUnique(candidates, 2 + Math.floor(Math.random() * 2))
    .forEach(key => { state[key].excluded = true; });
  commit(CATEGORIES.map(c => c.key));
}

export function unlockAll() {
  CATEGORIES.forEach(c => { state[c.key].locked = false; });
  commit();
}

export function toggleLock(key) {
  state[key].locked = !state[key].locked;
  commit();
}

// Muuttaa moniarvoisen kentän arvojen määrää. Lisätyt paikat arvotaan, poistetut leikataan lopusta.
export function changeCount(key, delta) {
  const entry = state[key];
  if (entry.locked || !CATEGORY_BY_KEY[key].multi) return;

  const next = Math.min(MAX_COUNT, Math.max(MIN_COUNT, entry.count + delta));
  if (next === entry.count) return;

  entry.count = next;
  if (entry.values.length > next) {
    entry.values = entry.values.slice(0, next);
  } else {
    const pool = jamSelectionOptions(catalog, key, jam, next).map(v => v.text);
    const extra = pickUnique(pool.filter(v => !entry.values.includes(v)), next - entry.values.length);
    entry.values = [...entry.values, ...extra];
  }
  commit([key]);
}

// Asettaa arvot käsin (listasta valinta). Toimii myös lukitussa kentässä ja ottaa pois jätetyn kentän mukaan.
export function setValues(key, values) {
  const entry = state[key];
  const unique = [...new Set(values)].slice(0, MAX_COUNT);
  if (CATEGORY_BY_KEY[key].multi) {
    entry.count = Math.max(MIN_COUNT, unique.length);
  }
  entry.values = unique.slice(0, entry.count);
  entry.excluded = false;
  commit([key]);
}

// Lisää yksittäisen arvon (Browse Lists). Moniarvoisessa kentässä vanhin arvo väistyy, jos tila on täynnä.
export function addValue(key, value) {
  const entry = state[key];
  if (!entry.values.includes(value)) {
    entry.values = CATEGORY_BY_KEY[key].multi
      ? [...entry.values, value].slice(-entry.count)
      : [value];
  }
  entry.excluded = false;
  commit([key]);
}

// Onko jokainen lukitsematon kenttä jo jätetty tyhjäksi.
export function allUnlockedExcluded() {
  const unlocked = CATEGORIES.filter(c => !state[c.key].locked);
  return unlocked.length > 0 && unlocked.every(c => state[c.key].excluded);
}

// Yläpalkin nappi: jättää kaikki lukitsemattomat kentät tyhjiksi, tai jos ne jo ovat, ottaa ne takaisin mukaan.
export function toggleUnlockedExcluded() {
  const exclude = !allUnlockedExcluded();
  const changed = CATEGORIES.map(c => c.key).filter(key => !state[key].locked);
  changed.forEach(key => {
    state[key].excluded = exclude;
    if (!exclude && state[key].values.length < state[key].count) rollInto(key);
  });
  commit(changed);
}

// Jättää kentän pois arvonnasta ja promptista tai ottaa sen takaisin mukaan.
// Arvot säilyvät taustalla, joten takaisin otettu kenttä palautuu ennalleen.
export function toggleExcluded(key) {
  const entry = state[key];
  entry.excluded = !entry.excluded;
  if (!entry.excluded && entry.values.length < entry.count) rollInto(key);
  commit([key]);
}
