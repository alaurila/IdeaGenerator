// Browse Lists: yksi lista kerrallaan (valitaan pudotusvalikosta), neljä sivua rinnakkain.
// Hakukenttä suodattaa valittua listaa. Arvon klikkaus asettaa sen generaattoriin.

import { CATEGORIES } from './config.js';
import { lists } from './dataLoader.js';
import { state } from './state.js';
import { addValue } from './generator.js';
import { escapeHtml } from './dom.js';
import { showToast } from './ui.js';
import { t, categoryLabel } from './i18n.js';

const PAGE_SIZE = 12;
const PAGES_VISIBLE = 4;

let currentKey = CATEGORIES[0].key;
let query = '';
const firstPage = {}; // kategorian avain -> ensimmäisen näkyvän sivun indeksi

let container;

function filteredList() {
  const q = query.trim().toLowerCase();
  const all = lists[currentKey];
  return q ? all.filter(v => v.toLowerCase().includes(q)) : all;
}

function pageCount() {
  return Math.max(1, Math.ceil(filteredList().length / PAGE_SIZE));
}

function render() {
  const list = filteredList();
  const total = pageCount();
  const start = Math.min(firstPage[currentKey] ?? 0, Math.max(0, total - PAGES_VISIBLE));
  const end = Math.min(total, start + PAGES_VISIBLE);
  const selected = new Set(state[currentKey].values);

  let html = '';
  for (let page = start; page < end; page++) {
    const values = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    html += `
      <section class="browse-page">
        <h4 class="browse-page-num">${t('browse.page', { page: page + 1 })}</h4>
        <ol class="browse-values">
          ${values.map(v => `
            <li><button type="button" class="browse-item${selected.has(v) ? ' is-selected' : ''}" data-value="${escapeHtml(v)}" title="${t('browse.setValue')}">${escapeHtml(v)}</button></li>`).join('')}
        </ol>
      </section>`;
  }
  container.querySelector('.browse-pages').innerHTML = list.length
    ? html
    : `<p class="browse-empty">${t('browse.noResults')}</p>`;

  const all = lists[currentKey].length;
  container.querySelector('.browse-count').textContent = list.length === all
    ? t('browse.count', { count: all })
    : t('browse.matches', { count: list.length, total: all });
  container.querySelector('.page-label').textContent = end - start > 1 ? `${start + 1}–${end} / ${total}` : `${start + 1} / ${total}`;
  container.querySelector('[data-page="prev"]').disabled = start === 0;
  container.querySelector('[data-page="next"]').disabled = end >= total;
}

function movePages(delta) {
  const maxStart = Math.max(0, pageCount() - PAGES_VISIBLE);
  const start = firstPage[currentKey] ?? 0;
  firstPage[currentKey] = Math.min(maxStart, Math.max(0, start + delta));
  render();
}

// Rakentaa työkalurivin nykyisellä kielellä. Kutsutaan myös kielen vaihtuessa.
export function buildBrowser() {
  container.innerHTML = `
    <div class="browse-toolbar">
      <div class="select-wrap">
        <select class="browse-select" aria-label="${t('browse.selectList')}">
          ${CATEGORIES.map(c => `<option value="${c.key}"${c.key === currentKey ? ' selected' : ''}>${escapeHtml(categoryLabel(c.key))} (${lists[c.key].length})</option>`).join('')}
        </select>
        <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
      </div>
      <div class="browse-search-wrap">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" class="browse-search" placeholder="${t('browse.search')}" aria-label="${t('browse.search')}" autocomplete="off" value="${escapeHtml(query)}">
      </div>
      <span class="browse-count"></span>
      <div class="pager">
        <button class="icon-btn" data-page="prev" aria-label="${t('browse.prev')}"><i class="fa-solid fa-arrow-left"></i></button>
        <span class="page-label"></span>
        <button class="icon-btn" data-page="next" aria-label="${t('browse.next')}"><i class="fa-solid fa-arrow-right"></i></button>
        <button class="icon-btn" data-page="random" title="${t('browse.random')}"><i class="fa-solid fa-shuffle"></i></button>
      </div>
    </div>
    <div class="browse-pages"></div>
  `;
  render();
}

// Kytkee tapahtumat kerran (delegointi säiliöön, joten uudelleenrakennus ei tuplaa niitä).
export function initBrowser(element) {
  container = element;

  container.addEventListener('change', event => {
    if (!event.target.matches('.browse-select')) return;
    currentKey = event.target.value;
    render();
  });

  container.addEventListener('input', event => {
    if (!event.target.matches('.browse-search')) return;
    query = event.target.value;
    firstPage[currentKey] = 0;
    render();
  });

  container.addEventListener('click', event => {
    const pageBtn = event.target.closest('[data-page]');
    if (pageBtn) {
      const action = pageBtn.dataset.page;
      if (action === 'prev') movePages(-PAGES_VISIBLE);
      else if (action === 'next') movePages(PAGES_VISIBLE);
      else {
        firstPage[currentKey] = 0;
        movePages(Math.floor(Math.random() * pageCount()));
      }
      return;
    }

    const item = event.target.closest('.browse-item');
    if (item) {
      addValue(currentKey, item.dataset.value);
      showToast(`${categoryLabel(currentKey)}: ${item.dataset.value}`);
    }
  });

  buildBrowser();
}

export function refreshBrowser() {
  if (container) render();
}
