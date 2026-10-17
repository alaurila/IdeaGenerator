import { catalog } from './dataLoader.js';
import { jam, setJam, rollJamTheme } from './jamState.js';
import { currentLanguage, t } from './i18n.js';
import { escapeHtml } from './dom.js';

export function renderJam() {
  document.getElementById('jam-panel').hidden = !jam.enabled;
  document.getElementById('jam-toggle').setAttribute('aria-pressed', String(jam.enabled));
  for (const key of ['hours', 'team', 'experience']) document.getElementById(`jam-${key}`).value = jam[key];
  const input = document.getElementById('jam-theme');
  input.value = jam.themeText;
  const lock = document.getElementById('jam-theme-lock');
  lock.textContent = t(jam.themeLocked ? 'jam.unlockTheme' : 'jam.lockTheme');
  lock.setAttribute('aria-pressed', String(jam.themeLocked));
  lock.disabled = !jam.themeText;
  document.getElementById('jam-theme-roll').disabled = jam.themeLocked;
  const list = document.getElementById('jam-theme-list');
  if (list.dataset.language !== currentLanguage) {
    list.innerHTML = (catalog.jam?.themes ?? []).map(v => `<option value="${escapeHtml(v.text)}"></option>`).join('');
    list.dataset.language = currentLanguage;
  }
}

export function bindJam(onConstraints, onTheme) {
  document.getElementById('jam-toggle').addEventListener('click', () => onConstraints({ enabled: !jam.enabled }));
  for (const key of ['hours', 'team', 'experience']) {
    document.getElementById(`jam-${key}`).addEventListener('change', event => onConstraints({ [key]: event.target.value }));
  }
  document.getElementById('jam-theme').addEventListener('change', event => {
    const text = event.target.value.trim().slice(0, 200);
    const theme = catalog.jam.themes.find(v => v.text === text);
    setJam({ themeId: theme?.id ?? null, themeText: text, themeLocked: Boolean(text) });
    if (!text) rollJamTheme(catalog);
    onTheme();
  });
  document.getElementById('jam-theme-roll').addEventListener('click', () => { rollJamTheme(catalog); onTheme(); });
  document.getElementById('jam-theme-lock').addEventListener('click', () => {
    setJam({ themeLocked: !jam.themeLocked });
    onTheme();
  });
}
