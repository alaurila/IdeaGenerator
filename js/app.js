// Sovelluksen käynnistys: lataa kielen ja datan, palauttaa tilan ja kytkee tapahtumat.

import { catalog, loadAllLists } from './dataLoader.js';
import { state, initState, subscribe } from './state.js';
import {
  rollAll, rollCategory, fillMissing, newIdea, unlockAll,
  toggleLock, changeCount, toggleExcluded, translateValues,
  toggleUnlockedExcluded, allUnlockedExcluded
} from './generator.js';
import { buildCards, updateCards, showToast } from './ui.js';
import { initPicker, openPicker } from './picker.js';
import { buildPrompt } from './promptBuilder.js';
import { initBrowser, buildBrowser, refreshBrowser } from './listBrowser.js';
import { LANGUAGES, currentLanguage, savedLanguage, loadLanguage, applyStaticTexts, t } from './i18n.js';
import { escapeHtml } from './dom.js';
import { readIdeaUrl, updateIdeaUrl } from './ideaUrl.js';
import { SCHEMA_VERSION, GENERATOR_VERSION } from './ideaEngine.js';

const grid = document.getElementById('generator-grid');
const promptEl = document.getElementById('prompt-output');
const browser = document.getElementById('browse-grid');
const languageSwitch = document.getElementById('language-switch');
const emptyUnlockedBtn = document.getElementById('empty-unlocked');
let sharedSeed = null;
let sharedSnapshot = null;

function ideaSnapshot() {
  return JSON.stringify(Object.entries(state).map(([key, entry]) =>
    [key, entry.values, entry.excluded]));
}

function syncUrl() {
  // An edited idea can no longer be reproduced with its original seed.
  if (sharedSnapshot !== ideaSnapshot()) sharedSeed = null;
  const url = updateIdeaUrl(new URL(window.location.href), currentLanguage, sharedSeed);
  window.history.replaceState(null, '', url);
  document.getElementById('idea-output').textContent = JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    catalogVersion: catalog.catalogVersion,
    language: currentLanguage,
    seed: sharedSeed,
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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Varakeino, jos Clipboard API ei ole käytettävissä.
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

async function copyPrompt(event) {
  event.preventDefault(); // ei avaa/sulje AI Prompt -osiota
  await copyText(buildPrompt());
  showToast(t('toast.copied'));
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
  buildCards(grid);
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
  renderLanguage();
  if (seed !== null) startNewIdea(seed);
  else translateValues(oldCatalog);
}

function bindEvents() {
  document.getElementById('roll-all').addEventListener('click', rollAll);
  document.getElementById('unlock-all').addEventListener('click', unlockAll);
  document.getElementById('new-idea').addEventListener('click', () => startNewIdea());
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
  const requested = readIdeaUrl(new URL(window.location.href), LANGUAGES.map(l => l.code), savedLanguage());
  const language = requested.language;
  try {
    await Promise.all([loadLanguage(language), loadAllLists(language)]);
  } catch (error) {
    grid.innerHTML = `<p class="load-error">${escapeHtml(t('app.loadError', { error: error.message }))}<br>
      ${escapeHtml(t('app.loadErrorHint'))}</p>`;
    return;
  }

  const restored = initState();
  applyStaticTexts();
  renderLanguageSwitch();
  buildCards(grid);
  initBrowser(browser);
  initPicker();
  bindEvents();
  subscribe(render);

  if (requested.fresh) {
    startNewIdea();
  } else if (requested.seed !== null) {
    startNewIdea(requested.seed);
  } else if (restored) {
    fillMissing();
    render([]);
  } else {
    startNewIdea();
  }
}

start();
