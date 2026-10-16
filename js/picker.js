// "Valitse listasta" -ikkuna: haku, scrollattava lista ja yksi- tai moniarvoinen valinta.

import { CATEGORY_BY_KEY, MAX_COUNT } from './config.js';
import { lists } from './dataLoader.js';
import { state } from './state.js';
import { setValues } from './generator.js';
import { escapeHtml } from './dom.js';
import { t, categoryLabel } from './i18n.js';

const dialog = document.getElementById('picker');
const titleEl = dialog.querySelector('.picker-title');
const searchEl = dialog.querySelector('.picker-search');
const listEl = dialog.querySelector('.picker-list');
const selectedEl = dialog.querySelector('.picker-selected');
const footerEl = dialog.querySelector('.picker-footer');
const counterEl = dialog.querySelector('.picker-counter');
const applyBtn = dialog.querySelector('.picker-apply');

let currentKey = null;
let selection = [];

function isMulti() {
  return Boolean(CATEGORY_BY_KEY[currentKey]?.multi);
}

function filteredValues() {
  const query = searchEl.value.trim().toLowerCase();
  const all = lists[currentKey];
  return query ? all.filter(v => v.toLowerCase().includes(query)) : all;
}

function renderList() {
  const values = filteredValues();
  const chosen = new Set(selection);
  listEl.innerHTML = values.length
    ? values.map(v => `
        <li><button type="button" class="picker-item${chosen.has(v) ? ' is-selected' : ''}" data-value="${escapeHtml(v)}">
          <span>${escapeHtml(v)}</span>
          <i class="fa-solid fa-check" aria-hidden="true"></i>
        </button></li>`).join('')
    : `<li class="picker-empty">${t('picker.noResults')}</li>`;
}

function renderSelection() {
  if (!isMulti()) return;
  selectedEl.innerHTML = selection.map(v => `
    <button type="button" class="chip" data-remove="${escapeHtml(v)}" title="${t('picker.remove')}">
      ${escapeHtml(v)} <i class="fa-solid fa-xmark"></i>
    </button>`).join('');
  counterEl.textContent = t('picker.selected', { count: selection.length, max: MAX_COUNT });
  applyBtn.disabled = selection.length === 0;
}

function choose(value) {
  if (!isMulti()) {
    setValues(currentKey, [value]);
    dialog.close();
    return;
  }
  if (selection.includes(value)) {
    selection = selection.filter(v => v !== value);
  } else if (selection.length < MAX_COUNT) {
    selection = [...selection, value];
  }
  renderSelection();
  renderList();
}

export function openPicker(key) {
  currentKey = key;
  selection = [...state[key].values];
  const category = CATEGORY_BY_KEY[key];

  titleEl.textContent = t('picker.title', { label: categoryLabel(key), count: lists[key].length });
  searchEl.value = '';
  dialog.classList.toggle('is-multi', Boolean(category.multi));
  footerEl.hidden = !category.multi;
  selectedEl.hidden = !category.multi;

  renderSelection();
  renderList();
  dialog.showModal();
  listEl.scrollTop = 0;
  searchEl.focus();
}

export function initPicker() {
  searchEl.addEventListener('input', () => {
    renderList();
    listEl.scrollTop = 0;
  });

  searchEl.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = filteredValues()[0];
      if (first) choose(first);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      listEl.querySelector('.picker-item')?.focus();
    }
  });

  listEl.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...listEl.querySelectorAll('.picker-item')];
    const index = items.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    if (next < 0) searchEl.focus();
    else items[Math.min(next, items.length - 1)]?.focus();
  });

  listEl.addEventListener('click', event => {
    const item = event.target.closest('.picker-item');
    if (item) choose(item.dataset.value);
  });

  selectedEl.addEventListener('click', event => {
    const chip = event.target.closest('[data-remove]');
    if (chip) choose(chip.dataset.remove);
  });

  applyBtn.addEventListener('click', () => {
    if (selection.length) setValues(currentKey, selection);
    dialog.close();
  });

  dialog.querySelector('.picker-close').addEventListener('click', () => dialog.close());

  // Klikkaus taustalle sulkee ikkunan.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
}
