// Käyttöliittymän kielet: kielitiedostot ovat lang/<koodi>.json, data on data/<koodi>/.

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'fi', label: 'FI', name: 'Suomi' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'fr', label: 'FR', name: 'Français' }
];
export const DEFAULT_LANGUAGE = 'en';

const STORAGE_KEY = 'gameIdeaGenerator.lang';

let strings = {};
export let currentLanguage = DEFAULT_LANGUAGE;

export function savedLanguage() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some(l => l.code === code)) return code;
  } catch {
    // localStorage ei käytettävissä
  }
  return DEFAULT_LANGUAGE;
}

export async function loadLanguage(code) {
  const response = await fetch(`lang/${code}.json`);
  if (!response.ok) throw new Error(`lang/${code}.json: HTTP ${response.status}`);
  strings = await response.json();
  currentLanguage = code;
  document.documentElement.lang = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // ei kriittinen
  }
}

// Palauttaa käännöksen ja korvaa {paikkamerkit} params-objektin arvoilla.
export function t(key, params = {}) {
  const text = strings[key];
  if (typeof text !== 'string') return key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match));
}

export function tList(key) {
  return Array.isArray(strings[key]) ? strings[key] : [];
}

export function categoryLabel(key) {
  return t(`category.${key}`);
}

export function categoryPromptLabel(key) {
  return strings[`categoryPrompt.${key}`] ?? categoryLabel(key);
}

// Päivittää HTML:n staattiset tekstit data-i18n-attribuuttien perusteella.
export function applyStaticTexts(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
}
