// Load one versioned catalog; display lists remain compatible with the UI.
import { CATEGORIES } from './config.js';
import { SCHEMA_VERSION } from './ideaEngine.js';
export const lists = {};
export let catalog = null;

export async function loadAllLists(language) {
  const path = 'data/' + language + '/catalog.json';
  const response = await fetch(path);
  if (!response.ok) throw new Error(path + ': HTTP ' + response.status);
  const loaded = await response.json();
  if (loaded.schemaVersion !== SCHEMA_VERSION || loaded.language !== language) {
    throw new Error('Unsupported catalog: ' + path);
  }
  const displayLists = Object.fromEntries(CATEGORIES.map(({ key }) => {
    const options = loaded.categories[key];
    if (!Array.isArray(options) || !options.length || options.some(v =>
      typeof v?.id !== 'string' || typeof v?.text !== 'string')) {
      throw new Error('Invalid catalog category: ' + key);
    }
    return [key, [...new Set(options.map(v => v.text))]];
  }));
  catalog = loaded;
  Object.assign(lists, displayLists);
  return lists;
}
