import { JAM_DEFAULTS, normalizeJam } from './jamPolicy.js';
import { readJamUrl } from './ideaUrl.js';

export const jam = { ...JAM_DEFAULTS };
const STORAGE_KEY = 'gameIdeaGenerator.jam.v1';

export function setJam(patch) {
  Object.assign(jam, normalizeJam({ ...jam, ...patch }));
}

export function translateJamTheme(catalog) {
  if (!jam.themeId) return;
  const theme = catalog.jam?.themes.find(v => v.id === jam.themeId);
  if (theme) jam.themeText = theme.text;
  else setJam({ themeId: null, themeText: '', themeLocked: false });
}

export function loadJam(url, catalog) {
  const requested = readJamUrl(url);
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch {}
  // Explicit replays without jam parameters must not inherit a saved jam mode.
  const explicit = url.searchParams.has('seed') || url.searchParams.get('fresh') === '1';
  try { setJam({ ...JAM_DEFAULTS, ...(requested ?? (explicit ? {} : saved)) }); }
  catch { setJam(JAM_DEFAULTS); }
  translateJamTheme(catalog);
}

export function saveJam() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(jam)); } catch {}
}

export function rollJamTheme(catalog) {
  if (jam.themeLocked) return;
  const pool = catalog.jam.themes.filter(v => v.id !== jam.themeId);
  const theme = pool[Math.floor(Math.random() * pool.length)];
  setJam({ themeId: theme.id, themeText: theme.text });
}

export function acceptJamIdea(idea) {
  if (idea.jam) setJam({ themeId: idea.jam.theme.id, themeText: idea.jam.theme.text });
}
