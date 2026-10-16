// Lataa valitun kielen JSON-listat kansiosta data/<kieli>/. Sisäkkäiset rakenteet (esim. genres.json:n alaryhmät) litistetään yhdeksi listaksi.

import { CATEGORIES } from './config.js';

// Kategorian avain -> merkkijonolista (tuplat poistettu)
export const lists = {};

// Kategorian avain -> merkkijonot tiedoston alkuperäisessä järjestyksessä tuplineen.
// Kielten tiedostot ovat rinnakkaisia, joten saman indeksin arvo on käännös.
export const rawLists = {};

function collectStrings(node, out) {
  if (typeof node === 'string') {
    const value = node.trim();
    if (value) out.push(value);
  } else if (Array.isArray(node)) {
    node.forEach(item => collectStrings(item, out));
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach(item => collectStrings(item, out));
  }
  return out;
}

async function loadOne(category, language) {
  const path = `data/${language}/${category.file}`;
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  return collectStrings(await response.json(), []);
}

export async function loadAllLists(language) {
  const results = await Promise.all(CATEGORIES.map(c => loadOne(c, language)));
  CATEGORIES.forEach((category, i) => {
    rawLists[category.key] = results[i];
    lists[category.key] = [...new Set(results[i])];
  });
  return lists;
}
