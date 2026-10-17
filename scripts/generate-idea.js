// Generate a new idea for each invocation; an explicit seed requests a replay.
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../js/i18n.js';
import { generateIdea } from '../js/ideaEngine.js';
import { generateSmartIdea } from '../js/smartGeneration.js';
import { formatExplanation } from '../js/scoreExplanations.js';

try {
  const { values } = parseArgs({ options: {
    lang: { type: 'string', default: DEFAULT_LANGUAGE },
    seed: { type: 'string' },
    smart: { type: 'boolean', default: false },
    jam: { type: 'boolean', default: false },
    hours: { type: 'string', default: '48' },
    team: { type: 'string', default: 'solo' },
    experience: { type: 'string', default: 'beginner' },
    theme: { type: 'string' },
    'theme-id': { type: 'string' },
    'catalog-url': { type: 'string' }
  } });
  if (!LANGUAGES.some(l => l.code === values.lang)) throw new Error('Unsupported language');
  let catalog;
  if (values['catalog-url']) {
    const response = await fetch(values['catalog-url']);
    if (!response.ok) throw new Error(`Catalog: HTTP ${response.status}`);
    catalog = await response.json();
  } else {
    catalog = JSON.parse(await readFile(new URL(`../data/${values.lang}/catalog.json`, import.meta.url), 'utf8'));
  }
  const generate = values.smart ? generateSmartIdea : generateIdea;
  const idea = await generate({ catalog, language: values.lang, seed: values.seed ?? randomUUID(),
    jam: { enabled: values.jam, hours: Number(values.hours), team: values.team, experience: values.experience,
      themeId: values['theme-id'] ?? null, themeText: values.theme ?? '',
      themeLocked: Boolean(values['theme-id'] || values.theme) } });
  if (values.smart) {
    const strings = JSON.parse(await readFile(new URL(`../lang/${values.lang}.json`, import.meta.url), 'utf8'));
    const translate = (key, params = {}) => {
      if (typeof strings[key] !== 'string') throw new Error(`Missing translation: ${key}`);
      return strings[key].replace(/\{(\w+)\}/g, (match,name) => name in params ? params[name] : match);
    };
    idea.explanations = idea.explanations.map(explanation => ({...explanation,
      text:formatExplanation(explanation,translate)}));
  }
  process.stdout.write(JSON.stringify(idea, null, 2) + '\n');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
