// Generaattorin korttien renderöinti tilan perusteella.

import { CATEGORIES, CATEGORY_BY_KEY, MIN_COUNT, MAX_COUNT } from './config.js';
import { state } from './state.js';
import { el, escapeHtml } from './dom.js';
import { t, categoryLabel } from './i18n.js';

export function buildCards(container, categories = CATEGORIES) {
  container.innerHTML = categories.map(c => `
    <article class="card${c.multi ? ' card--multi' : ''}" data-key="${c.key}">
      <header class="card-head">
        <i class="fa-solid ${c.icon} card-icon" aria-hidden="true"></i>
        <h3 class="card-title">${escapeHtml(categoryLabel(c.key))}</h3>
        <span class="card-lock-badge" title="${t('card.lockedBadge')}"><i class="fa-solid fa-lock"></i></span>
      </header>
      <ul class="card-values" aria-live="polite"></ul>
      <footer class="card-actions">
        <button class="icon-btn" data-action="lock"></button>
        <button class="icon-btn" data-action="roll" title="${t('card.roll')}"><i class="fa-solid fa-dice"></i></button>
        <button class="icon-btn" data-action="pick" title="${t('card.pick')}"><i class="fa-solid fa-list-ul"></i></button>
        <button class="icon-btn" data-action="exclude"></button>
        ${c.multi ? `
          <div class="stepper" title="${t('card.count')}">
            <button class="stepper-btn" data-action="dec" aria-label="${t('card.less')}"><i class="fa-solid fa-minus"></i></button>
            <span class="stepper-value"></span>
            <button class="stepper-btn" data-action="inc" aria-label="${t('card.more')}"><i class="fa-solid fa-plus"></i></button>
          </div>` : ''}
      </footer>
    </article>
  `).join('');
}

function updateCard(card) {
  const key = card.dataset.key;
  const entry = state[key];
  const category = CATEGORY_BY_KEY[key];

  const frozen = entry.locked || entry.excluded;

  card.classList.toggle('is-locked', entry.locked && !entry.excluded);
  card.classList.toggle('is-excluded', entry.excluded);

  const valuesEl = card.querySelector('.card-values');
  valuesEl.innerHTML = entry.excluded
    ? `<li class="is-empty">${t('card.excluded')}</li>`
    : entry.values.length
      ? entry.values.map(v => `<li>${escapeHtml(v)}</li>`).join('')
      : '<li class="is-empty">—</li>';

  const lockBtn = card.querySelector('[data-action="lock"]');
  lockBtn.innerHTML = `<i class="fa-solid ${entry.locked ? 'fa-lock' : 'fa-lock-open'}"></i>`;
  lockBtn.title = entry.locked ? t('card.locked') : t('card.unlocked');
  lockBtn.setAttribute('aria-pressed', String(entry.locked));
  lockBtn.classList.toggle('is-active', entry.locked);
  lockBtn.disabled = entry.excluded;

  const excludeBtn = card.querySelector('[data-action="exclude"]');
  excludeBtn.innerHTML = `<i class="fa-solid ${entry.excluded ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  excludeBtn.title = entry.excluded ? t('card.excludedTitle') : t('card.exclude');
  excludeBtn.setAttribute('aria-pressed', String(entry.excluded));
  excludeBtn.classList.toggle('is-active-muted', entry.excluded);

  card.querySelector('[data-action="roll"]').disabled = frozen;

  if (category.multi) {
    card.querySelector('.stepper-value').textContent = entry.count;
    card.querySelector('[data-action="dec"]').disabled = frozen || entry.count <= MIN_COUNT;
    card.querySelector('[data-action="inc"]').disabled = frozen || entry.count >= MAX_COUNT;
  }
}

export function updateCards(container, changedKeys = []) {
  container.querySelectorAll('.card').forEach(updateCard);
  changedKeys.forEach(key => {
    const card = container.querySelector(`.card[data-key="${key}"]`);
    if (!card) return;
    card.classList.remove('just-rolled');
    void card.offsetWidth; // käynnistää animaation uudelleen
    card.classList.add('just-rolled');
  });
}

let toastTimer;
export function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = el('div', 'toast');
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
}
