// Sovelluksen käynnistys: lataa kielen ja datan, palauttaa tilan ja kytkee tapahtumat.

import { catalog, loadAllLists } from './dataLoader.js';
import { state, initState, subscribe, commit } from './state.js';
import {
  rollAll, rollCategory, fillMissing, newIdea, exampleIdea, unlockAll,
  toggleLock, changeCount, toggleExcluded, translateValues,
  toggleUnlockedExcluded, allUnlockedExcluded
} from './generator.js';
import { buildCards, updateCards, showToast } from './ui.js';
import { initPicker, openPicker } from './picker.js';
import { buildPrompt } from './promptBuilder.js';
import { initBrowser, buildBrowser, refreshBrowser } from './listBrowser.js';
import { LANGUAGES, currentLanguage, savedLanguage, loadLanguage, applyStaticTexts, t } from './i18n.js';
import { escapeHtml } from './dom.js';
import { readIdeaUrl, updateIdeaUrl, updateJamUrl } from './ideaUrl.js';
import { SCHEMA_VERSION, GENERATOR_VERSION } from './ideaEngine.js';
import { CATEGORIES } from './config.js';
import { jam, setJam, loadJam, saveJam, translateJamTheme } from './jamState.js';
import { JAM_POLICY_VERSION } from './jamPolicy.js';
import { bindJam, renderJam } from './jamUi.js';
import { copyText } from './clipboard.js';
import { createShareUrl, readSharedIdea, resolveSharedIdea } from './shareData.js';
import { bindSharing } from './shareUi.js';

const grid = document.getElementById('generator');
const starterKeys = ['genres', 'main_goals', 'twists'];
let emphasizeAll = false;
try { emphasizeAll = localStorage.getItem('gameIdeaGenerator.emphasizeAll') === 'true'; } catch {}

function updateFieldEmphasis() {
  grid.classList.toggle('is-focused', !emphasizeAll);
  const button = document.getElementById('emphasize-all');
  button.setAttribute('aria-pressed', String(emphasizeAll));
  button.textContent = t(emphasizeAll ? 'starter.focusMain' : 'starter.emphasizeAll');
}

function buildGenerator() {
  buildCards(document.getElementById('generator-grid'),
    [...starterKeys.map(key => CATEGORIES.find(c => c.key === key)),
      ...CATEGORIES.filter(c => !starterKeys.includes(c.key))]);
  grid.querySelectorAll('.card').forEach(card => {
    card.classList.toggle('card--secondary', !starterKeys.includes(card.dataset.key));
  });
  updateFieldEmphasis();
}
const promptEl = document.getElementById('prompt-output');
const browser = document.getElementById('browse-grid');
const languageSwitch = document.getElementById('language-switch');
const emptyUnlockedBtn = document.getElementById('empty-unlocked');
let sharedSeed = null;
let sharedSnapshot = null;

function ideaSnapshot() {
  return JSON.stringify({ fields: Object.entries(state).map(([key, entry]) =>
    [key, entry.values, entry.excluded]), jam });
}

function syncUrl() {
  // An edited idea can no longer be reproduced with its original seed.
  if (sharedSnapshot !== ideaSnapshot()) sharedSeed = null;
  let url = updateJamUrl(updateIdeaUrl(new URL(window.location.href), currentLanguage, sharedSeed), jam);
  // Keep a previously opened shared link in sync as the user edits it.
  if (url.hash.startsWith('#idea=')) url = createShareUrl(url, { state, catalog, language: currentLanguage, jam });
  window.history.replaceState(null, '', url);
  saveJam();
  document.getElementById('idea-output').textContent = JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    catalogVersion: catalog.catalogVersion,
    language: currentLanguage,
    seed: sharedSeed,
    ...(jam.enabled ? { jam: { ...jam, policyVersion: JAM_POLICY_VERSION,
      theme: { id: jam.themeId, text: jam.themeText } } } : {}),
    categories: Object.fromEntries(Object.entries(state).map(([key, entry]) =>
      [key, entry.excluded ? [] : entry.values.map((text, index) => ({
        id: entry.ids?.[index] ?? catalog.categories[key].find(option => option.text === text)?.id,
        text
      }))]))
  });
}

function startNewIdea(seed) {
  const idea = newIdea(seed);
  sharedSeed = idea.seed;
  sharedSnapshot = ideaSnapshot();
  syncUrl();
}

function startExampleIdea() {
  sharedSeed = null;
  sharedSnapshot = null;
  exampleIdea();
}

async function copyPrompt(event) {
  event.preventDefault(); // ei avaa/sulje AI Prompt -osiota
  try {
    await copyText(buildPrompt());
    showToast(t('toast.copied'));
  } catch { showToast(t('share.error')); }
}

// Nappi näyttää "Näytä kaikki", kun kaikki lukitsemattomat ovat jo tyhjinä.
function updateEmptyUnlockedButton() {
  const restore = allUnlockedExcluded();
  emptyUnlockedBtn.querySelector('i').className = `fa-solid ${restore ? 'fa-eye' : 'fa-eye-slash'}`;
  emptyUnlockedBtn.querySelector('span').textContent = t(restore ? 'toolbar.showAll' : 'toolbar.emptyUnlocked');
  emptyUnlockedBtn.title = t(restore ? 'toolbar.showAllTitle' : 'toolbar.emptyUnlockedTitle');
}

function render(changedKeys) {
  updateCards(grid, changedKeys);
  updateEmptyUnlockedButton();
  promptEl.textContent = buildPrompt();
  renderJam();
  refreshBrowser();
  syncUrl();
}

function renderLanguageSwitch() {
  languageSwitch.innerHTML = LANGUAGES.map(l => `
    <button type="button" class="lang-btn${l.code === currentLanguage ? ' is-active' : ''}" data-lang="${l.code}"
      title="${escapeHtml(l.name)}" aria-pressed="${l.code === currentLanguage}">${l.label}</button>`).join('');
}

// Rakentaa kieliriippuvaiset osat uudelleen.
function renderLanguage() {
  applyStaticTexts();
  renderLanguageSwitch();
  buildGenerator();
  buildBrowser();
  render([]);
}

async function changeLanguage(code) {
  if (code === currentLanguage) return;
  const seed = sharedSeed;
  const oldCatalog = catalog;
  try {
    await Promise.all([loadLanguage(code), loadAllLists(code)]);
  } catch (error) {
    showToast(error.message);
    return;
  }
  translateJamTheme(catalog);
  translateValues(oldCatalog);
  renderLanguage();
  if (seed !== null) {
    sharedSeed = seed;
    sharedSnapshot = ideaSnapshot();
    syncUrl();
  }
}

function bindEvents() {
  window.addEventListener('hashchange', () => {
    const url = new URL(window.location.href);
    if (!url.hash.startsWith('#idea=')) return;
    try {
      const snapshot = readSharedIdea(url, LANGUAGES.map(l => l.code));
      const resolved = resolveSharedIdea(snapshot, catalog);
      Object.assign(state, resolved.fields);
      setJam(resolved.jam);
      sharedSeed = null;
      sharedSnapshot = null;
      commit();
    } catch {
      url.hash = '';
      window.history.replaceState(null, '', url);
      showToast(t('share.invalid'));
    }
  });
  bindJam(patch => {
    setJam(patch);
    rollAll();
  }, () => commit());
  document.getElementById('emphasize-all').addEventListener('click', () => {
    emphasizeAll = !emphasizeAll;
    updateFieldEmphasis();
    try { localStorage.setItem('gameIdeaGenerator.emphasizeAll', String(emphasizeAll)); } catch {}
  });
  document.getElementById('generate-idea').addEventListener('click', startExampleIdea);
  document.getElementById('roll-all').addEventListener('click', rollAll);
  document.getElementById('unlock-all').addEventListener('click', unlockAll);
  emptyUnlockedBtn.addEventListener('click', toggleUnlockedExcluded);
  document.querySelectorAll('[data-copy-prompt]').forEach(btn => btn.addEventListener('click', copyPrompt));

  languageSwitch.addEventListener('click', event => {
    const button = event.target.closest('[data-lang]');
    if (button) changeLanguage(button.dataset.lang);
  });

  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const key = button.closest('.card').dataset.key;
    switch (button.dataset.action) {
      case 'lock': toggleLock(key); break;
      case 'roll': rollCategory(key); break;
      case 'pick': openPicker(key); break;
      case 'exclude': toggleExcluded(key); break;
      case 'dec': changeCount(key, -1); break;
      case 'inc': changeCount(key, +1); break;
    }
  });
}

async function start() {
  const url = new URL(window.location.href);
  let shared, shareError = false;
  try { shared = readSharedIdea(url, LANGUAGES.map(l => l.code)); }
  catch { shareError = true; }
  const requested = readIdeaUrl(url, LANGUAGES.map(l => l.code), shared?.language ?? savedLanguage());
  const language = requested.language;
  try {
    await Promise.all([loadLanguage(language), loadAllLists(language)]);
  } catch (error) {
    grid.innerHTML = `<p class="load-error">${escapeHtml(t('app.loadError', { error: error.message }))}<br>
      ${escapeHtml(t('app.loadErrorHint'))}</p>`;
    return;
  }

  const restored = initState();
  loadJam(new URL(window.location.href), catalog);
  let restoredShare = false;
  if (shared) {
    try {
      const resolved = resolveSharedIdea(shared, catalog);
      Object.assign(state, resolved.fields);
      setJam(resolved.jam);
      restoredShare = true;
    } catch { shareError = true; }
  }
  if (shareError) {
    url.hash = '';
    window.history.replaceState(null, '', url);
  }
  applyStaticTexts();
  renderLanguageSwitch();
  buildGenerator();
  initBrowser(browser);
  initPicker();
  bindEvents();
  subscribe(render);

  if (restoredShare) {
    commit();
  } else if (requested.fresh) {
    startNewIdea();
  } else if (requested.seed !== null) {
    startNewIdea(requested.seed);
  } else if (restored) {
    fillMissing();
    render([]);
  } else if (jam.enabled) {
    startNewIdea();
  } else {
    startExampleIdea();
  }
  bindSharing();
  if (shareError) showToast(t('share.invalid'));
}

start();
