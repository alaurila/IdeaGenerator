// Sovelluksen käynnistys: lataa kielen ja datan, palauttaa tilan ja kytkee tapahtumat.

import { catalog, loadAllLists } from './dataLoader.js';
import { state, initState, subscribe, commit } from './state.js';
import {
  rollAll, rollCategory, fillMissing, newIdea, exampleIdea, unlockAll, applySmartIdea,
  toggleLock, changeCount, toggleExcluded, translateValues,
  toggleUnlockedExcluded, allUnlockedExcluded
} from './generator.js';
import { buildCards, updateCards, showToast } from './ui.js';
import { initPicker, openPicker } from './picker.js';
import { buildPrompt } from './promptBuilder.js';
import { initBrowser, buildBrowser, refreshBrowser } from './listBrowser.js';
import { LANGUAGES, currentLanguage, savedLanguage, loadLanguage, applyStaticTexts, t } from './i18n.js';
import { escapeHtml } from './dom.js';
import { readIdeaUrl, updateIdeaUrl, updateJamUrl, readEasyUrl, updateEasyUrl, readHelpUrl } from './ideaUrl.js';
import { SCHEMA_VERSION, GENERATOR_VERSION, pickUnique } from './ideaEngine.js';
import { CATEGORIES } from './config.js';
import { jam, setJam, loadJam, saveJam, translateJamTheme } from './jamState.js';
import { JAM_POLICY_VERSION } from './jamPolicy.js';
import { bindJam, renderJam } from './jamUi.js';
import { copyText } from './clipboard.js';
import { createShareUrl, readSharedIdea, resolveSharedIdea } from './shareData.js';
import { bindSharing } from './shareUi.js';
import { findSmartIdea } from './smartRoll.js';
import { renderScores } from './scoreUi.js';
import { initTour } from './tour.js';

const grid = document.getElementById('generator');
const starterKeys = ['genres', 'main_goals', 'twists'];
let easyMode = false;
let easyExtraKeys = [];
let emphasizeAll = false;
try { emphasizeAll = localStorage.getItem('gameIdeaGenerator.emphasizeAll') === 'true'; } catch {}

function updateFieldEmphasis() {
  grid.classList.toggle('is-focused', !emphasizeAll);
  const button = document.getElementById('emphasize-all');
  button.setAttribute('aria-pressed', String(emphasizeAll));
  button.textContent = t(emphasizeAll ? 'starter.focusMain' : 'starter.emphasizeAll');
}

function setEasyMode(enabled) {
  if (enabled && !easyMode) {
    easyExtraKeys = pickUnique(CATEGORIES.map(c => c.key).filter(key => !starterKeys.includes(key)), 2);
  }
  easyMode = enabled;
}

function updateEasyMode() {
  document.body.classList.toggle('is-easy-mode', easyMode);
  const visibleKeys = new Set([...starterKeys, ...easyExtraKeys]);
  grid.querySelectorAll('.card').forEach(card => {
    card.hidden = easyMode && !visibleKeys.has(card.dataset.key);
  });
  document.getElementById('browse-section').hidden = easyMode;
  document.getElementById('easy-mode').setAttribute('aria-pressed', String(easyMode));
}

function buildGenerator() {
  buildCards(document.getElementById('generator-grid'),
    [...starterKeys.map(key => CATEGORIES.find(c => c.key === key)),
      ...CATEGORIES.filter(c => !starterKeys.includes(c.key))]);
  grid.querySelectorAll('.card').forEach(card => {
    card.classList.toggle('card--secondary', !starterKeys.includes(card.dataset.key));
  });
  updateFieldEmphasis();
  updateEasyMode();
}
const promptEl = document.getElementById('prompt-output');
const browser = document.getElementById('browse-grid');
const languageSwitch = document.getElementById('language-switch');
const emptyUnlockedBtn = document.getElementById('empty-unlocked');
let sharedSeed = null;
let sharedSnapshot = null;
let smartSearch = null;
let tour = null;

async function startSmartRoll() {
  if (smartSearch) return;
  const button = document.getElementById('smart-roll');
  const controller = new AbortController();
  smartSearch = controller;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.querySelector('[data-i18n="smart.action"]').textContent = t('smart.searching');
  const revision = JSON.stringify({state,jam,version:catalog.catalogVersion});
  try {
    const result = await findSmartIdea({state:structuredClone(state), catalog, jam:structuredClone(jam), signal:controller.signal});
    if (controller.signal.aborted || revision !== JSON.stringify({state,jam,version:catalog.catalogVersion})) return;
    smartSearch = null;
    if (result.changed) applySmartIdea(result.idea);
    showToast(t(result.reason === 'noEditable' ? 'smart.noEditable' : result.changed ? 'smart.selected' : 'smart.noImprovement'));
    tour?.action('smart');
  } catch (error) {
    if (error.name !== 'AbortError') showToast(t('smart.error'));
  } finally {
    if (smartSearch === controller) smartSearch = null;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.querySelector('[data-i18n="smart.action"]').textContent = t('smart.action');
  }
}

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
  url = updateEasyUrl(url, easyMode);
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
    tour?.action('copyPrompt');
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
  smartSearch?.abort();
  updateCards(grid, changedKeys);
  updateEmptyUnlockedButton();
  promptEl.textContent = buildPrompt();
  renderScores(state, catalog);
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
  smartSearch?.abort();
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
  document.getElementById('easy-mode').addEventListener('click', () => {
    setEasyMode(!easyMode);
    updateEasyMode();
    window.history.replaceState(null, '', updateEasyUrl(new URL(window.location.href), easyMode));
    tour?.action(easyMode ? 'easyOn' : 'easyOff');
  });
  document.getElementById('smart-roll').addEventListener('click', startSmartRoll);
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
  const newIdeaDialog = document.getElementById('new-idea-dialog');
  document.getElementById('generate-idea').addEventListener('click', () => {
    newIdeaDialog.returnValue = '';
    if (!newIdeaDialog.open) newIdeaDialog.showModal();
  });
  newIdeaDialog.addEventListener('close', () => {
    const confirmed = newIdeaDialog.returnValue === 'generate';
    newIdeaDialog.returnValue = '';
    if (confirmed) {
      startExampleIdea();
      tour?.action('generate');
    }
  });
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
      case 'lock': toggleLock(key); tour?.action('lock'); break;
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
  setEasyMode(readEasyUrl(url));
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
  bindSharing(action => tour?.action(action));
  document.getElementById('smart-roll').disabled = false;
  document.getElementById('easy-mode').disabled = false;
  tour = initTour({offer:!requested.fresh && requested.seed === null && !shared,
    force:readHelpUrl(url),
    getEasyMode:()=>easyMode,
    setEasyMode:enabled=>{
      setEasyMode(enabled);
      updateEasyMode();
      window.history.replaceState(null,'',updateEasyUrl(new URL(window.location.href),easyMode));
    }});
  if (shareError) showToast(t('share.invalid'));
}

start();
