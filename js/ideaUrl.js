// URL parsing is independent of browser globals so consumers can reuse it.
import { normalizeJam, JAM_DEFAULTS } from './jamPolicy.js';

export function readJamUrl(url) {
  if (!url.searchParams.has('jam')) return null;
  if (url.searchParams.get('jam') !== '1') return { ...JAM_DEFAULTS };
  const query = url.searchParams;
  try {
    return normalizeJam({ enabled: true, hours: Number(query.get('hours') ?? 48),
      team: query.get('team') ?? 'solo', experience: query.get('experience') ?? 'beginner',
      themeId: query.get('themeId'), themeText: query.get('theme') ?? '', themeLocked: query.get('themeLock') === '1' });
  } catch { return { ...JAM_DEFAULTS, enabled: true }; }
}

export function updateJamUrl(url, jam) {
  const result = new URL(url);
  const keys = ['jam', 'hours', 'team', 'experience', 'themeId', 'theme', 'themeLock'];
  keys.forEach(key => result.searchParams.delete(key));
  if (jam.enabled) {
    result.searchParams.set('jam', '1');
    result.searchParams.set('hours', String(jam.hours));
    result.searchParams.set('team', jam.team);
    result.searchParams.set('experience', jam.experience);
    if (jam.themeId) result.searchParams.set('themeId', jam.themeId);
    else if (jam.themeText) result.searchParams.set('theme', jam.themeText);
    if (jam.themeLocked) result.searchParams.set('themeLock', '1');
  }
  return result;
}
export function readIdeaUrl(url, supportedLanguages, fallbackLanguage) {
  const language = url.searchParams.get('lang');
  return {
    language: supportedLanguages.includes(language) ? language : fallbackLanguage,
    seed: url.searchParams.get('seed'),
    fresh: url.searchParams.get('fresh') === '1'
  };
}

export function updateIdeaUrl(url, language, seed = null) {
  const result = new URL(url);
  result.searchParams.delete('fresh');
  result.searchParams.set('lang', language);
  if (seed === null) result.searchParams.delete('seed');
  else result.searchParams.set('seed', seed);
  return result;
}
