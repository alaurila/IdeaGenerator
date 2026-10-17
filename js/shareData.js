import { CATEGORIES, MIN_COUNT, MAX_COUNT } from './config.js';
import { normalizeJam } from './jamPolicy.js';
import { readEasyUrl, updateEasyUrl, readHelpUrl } from './ideaUrl.js';

const MAX_PAYLOAD_LENGTH = 16000;

export function createShareUrl(url, { state, catalog, language, jam }) {
  const fields = Object.fromEntries(CATEGORIES.map(({ key }) => {
    const entry = state[key];
    const ids = entry.values.map((text, index) => {
      const retained = catalog.categories[key].find(v => v.id === entry.ids?.[index] && v.text === text);
      const option = retained ?? catalog.categories[key].find(v => v.text === text);
      if (!option) throw new Error(`Cannot share unknown value: ${key}`);
      return option.id;
    });
    return [key, [ids, Boolean(entry.locked), Boolean(entry.excluded), entry.count]];
  }));
  const snapshot = { version: 1, language, fields, jam: normalizeJam(jam) };
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  const encoded = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  if (encoded.length > MAX_PAYLOAD_LENGTH) throw new Error('Shared idea is too large');
  const result = new URL(url);
  const easy = readEasyUrl(result);
  const help = readHelpUrl(result);
  result.search = '';
  result.searchParams.set('lang', language);
  if (help) result.searchParams.set('help', '1');
  result.hash = `idea=${encoded}`;
  return updateEasyUrl(result, easy);
}

export function readSharedIdea(url, supportedLanguages) {
  if (!url.hash.startsWith('#idea=')) return null;
  const encoded = url.hash.slice(6);
  if (!encoded.length || encoded.length > MAX_PAYLOAD_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new TypeError('Invalid shared idea');
  }
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  const snapshot = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
  if (snapshot?.version !== 1 || !supportedLanguages.includes(snapshot.language) ||
      !snapshot.fields || typeof snapshot.fields !== 'object' ||
      Object.keys(snapshot.fields).length !== CATEGORIES.length) throw new TypeError('Unsupported shared idea');
  return snapshot;
}

export function resolveSharedIdea(snapshot, catalog) {
  const fields = Object.fromEntries(CATEGORIES.map(({ key, multi }) => {
    const field = snapshot.fields[key];
    if (!Array.isArray(field) || field.length !== 4) throw new TypeError(`Invalid shared field: ${key}`);
    const [ids, locked, excluded, count] = field;
    if (!Array.isArray(ids) || ids.length > MAX_COUNT || new Set(ids).size !== ids.length ||
        !Number.isInteger(count) || count < MIN_COUNT || count > (multi ? MAX_COUNT : 1) ||
        ids.length > count || typeof locked !== 'boolean' || typeof excluded !== 'boolean' ||
        (!excluded && ids.length !== count)) throw new TypeError(`Invalid shared field: ${key}`);
    const options = new Map(catalog.categories[key].map(v => [v.id, v.text]));
    if (ids.some(id => typeof id !== 'string' || !options.has(id))) throw new TypeError(`Unavailable shared option: ${key}`);
    return [key, { ids: [...ids], values: ids.map(id => options.get(id)), locked, excluded, count }];
  }));
  const jam = normalizeJam(snapshot.jam);
  if (jam.themeId) {
    const theme = catalog.jam?.themes.find(v => v.id === jam.themeId);
    if (!theme) throw new TypeError('Unavailable shared theme');
    jam.themeText = theme.text;
  }
  return { fields, jam };
}

export function buildShareText(model) {
  return [model.title, model.jamLines.join('\n'),
    model.sections.length ? model.sections.map(section => `${section.label}: ${section.values.join(' + ')}`).join('\n') : model.empty,
    `${model.credit}\n${model.generatorUrl}`].filter(Boolean).join('\n\n');
}

// Split long words as well as ordinary prose so exported images never clip text.
export function wrapCardText(text, maxWidth, measure) {
  const lines = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (line && measure(line + char) > maxWidth) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
