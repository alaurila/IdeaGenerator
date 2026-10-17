import { CATEGORIES } from './config.js';
import { state } from './state.js';
import { catalog } from './dataLoader.js';
import { jam } from './jamState.js';
import { currentLanguage, t, categoryLabel } from './i18n.js';
import { showToast } from './ui.js';
import { copyText } from './clipboard.js';
import { createShareUrl, buildShareText } from './shareData.js';
import { downloadShareCard } from './shareCard.js';

export function captureShareModel() {
  const priorities = ['genres', 'main_goals', 'twists'];
  const order = [...priorities, ...CATEGORIES.map(c => c.key).filter(key => !priorities.includes(key))];
  const base = new URL(window.location.href);
  base.search = '';
  base.hash = '';
  return {
    language: currentLanguage,
    title: t('share.title'), credit: t('share.credit'), empty: t('share.empty'),
    generatorUrl: base.href,
    shareUrl: createShareUrl(window.location.href, { state, catalog, language: currentLanguage, jam }).href,
    sections: order.filter(key => !state[key].excluded && state[key].values.length)
      .map(key => ({ key, label: categoryLabel(key), values: [...state[key].values] })),
    jamLines: jam.enabled ? [
      t('jam.promptSummary', { hours: jam.hours, team: t(`jam.${jam.team}`), experience: t(`jam.${jam.experience}`) }),
      t('jam.promptTheme', { theme: jam.themeText })
    ] : []
  };
}

export function bindSharing() {
  const actions = [
    ['copy-idea', model => copyText(buildShareText(model)), 'share.copied'],
    ['copy-idea-link', model => copyText(model.shareUrl), 'share.linkCopied'],
    ['download-idea', downloadShareCard, 'share.downloaded']
  ];
  for (const [id, action, success] of actions) {
    const button = document.getElementById(id);
    button.disabled = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        // Capture before any async work, so changing the idea cannot mix two exports.
        await action(captureShareModel());
        showToast(t(success));
      } catch {
        showToast(t('share.error'));
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });
  }
}
