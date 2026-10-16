// Arvontalogiikka. Kaikki funktiot muokkaavat statea ja kutsuvat commit().

import { CATEGORIES, CATEGORY_BY_KEY, MIN_COUNT, MAX_COUNT } from './config.js';
import { lists, rawLists } from './dataLoader.js';
import { state, commit } from './state.js';

// Arpoo n eri arvoa listasta. `avoid`-arvoja vältetään, jos listassa on tarpeeksi muuta.
function pickUnique(list, n, avoid = []) {
  const avoidSet = new Set(avoid);
  let pool = list.filter(v => !avoidSet.has(v));
  if (pool.length < n) pool = [...list];

  const picked = [];
  while (picked.length < n && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

// Palauttaa true, jos kenttä arvottiin (lukittua tai pois jätettyä ei arvota).
function rollInto(key) {
  const entry = state[key];
  if (entry.locked || entry.excluded) return false;
  entry.values = pickUnique(lists[key], entry.count, entry.values);
  return true;
}

export function rollCategory(key) {
  if (rollInto(key)) commit([key]);
}

export function rollAll() {
  const rolled = CATEGORIES.map(c => c.key).filter(rollInto);
  commit(rolled);
}

// Kielen vaihtuessa arvot vaihdetaan uuden kielen tiedoston samassa kohdassa olevaan arvoon
// (käännetyt tiedostot ovat rinnakkaisia). Jos arvoa ei löydy, kenttä täydennetään arpomalla.
export function translateValues(oldRawLists) {
  CATEGORIES.forEach(({ key }) => {
    const oldRaw = oldRawLists[key] ?? [];
    const newRaw = rawLists[key];
    const newList = lists[key];
    const entry = state[key];
    entry.values = [...new Set(entry.values
      .map(v => newRaw[oldRaw.indexOf(v)])
      .filter(Boolean))];
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

// Ensimmäinen käynti ja New Idea: arvotaan kaikki, lukitaan kaksi satunnaista kenttää
// ja jätetään 2–3 satunnaista tyhjäksi, jotta toiminnot näkyvät heti.
export function exampleIdea() {
  CATEGORIES.forEach(({ key }) => {
    state[key].locked = false;
    state[key].excluded = false;
    rollInto(key);
  });

  const LOCKED = 2;
  const emptyCount = 2 + Math.floor(Math.random() * 2);
  const keys = pickUnique(CATEGORIES.map(c => c.key), LOCKED + emptyCount);
  keys.slice(0, LOCKED).forEach(key => { state[key].locked = true; });
  keys.slice(LOCKED).forEach(key => { state[key].excluded = true; });

  commit(CATEGORIES.map(c => c.key));
}

// New Idea tuottaa saman satunnaisen lähtöasetelman kuin ensimmäinen käynti.
export function newIdea() {
  exampleIdea();
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
    const extra = pickUnique(lists[key].filter(v => !entry.values.includes(v)), next - entry.values.length);
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
