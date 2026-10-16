// Muodostaa AI-promptin nykyisestä tilasta valitulla kielellä.

import { CATEGORIES } from './config.js';
import { state } from './state.js';
import { t, tList, categoryPromptLabel } from './i18n.js';

// Teknologiakohtainen lisäohje: pidetään ideointi realistisena valitulle alustalle.
function technologyGuidance(tech) {
  const lower = tech.toLowerCase();
  const lines = [t('prompt.techIntro', { tech })];

  if (/html|javascript|typescript|web|canvas|phaser|pixi|three\.js/.test(lower)) {
    lines.push(t('prompt.techWeb'));
  } else if (/unity|unreal|godot|gamemaker|defold|bevy|monogame|love|pygame|engine/.test(lower)) {
    lines.push(t('prompt.techEngine'));
  } else {
    lines.push(t('prompt.techOther'));
  }
  lines.push(t('prompt.noCode'));
  return lines.join(' ');
}

export function buildPrompt() {
  // Tyhjiksi jätetyt kentät eivät tule promptiin lainkaan.
  const included = CATEGORIES.filter(c => !state[c.key].excluded && state[c.key].values.length);

  const sections = included
    .map(c => `${categoryPromptLabel(c.key)}: ${state[c.key].values.join(' + ')}`);

  const tech = included.some(c => c.key === 'technologies') ? state.technologies.values[0] : null;

  return [
    t('prompt.intro'),
    sections.join('\n'),
    t('prompt.sparring'),
    t('prompt.noGdd'),
    tech && technologyGuidance(tech),
    [t('prompt.stepsTitle'), ...tList('prompt.steps').map((step, i) => `${i + 1}. ${step}`)].join('\n'),
    t('prompt.goal')
  ].filter(Boolean).join('\n\n');
}
