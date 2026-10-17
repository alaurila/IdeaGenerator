// Generate a new idea for each invocation; an explicit seed requests a replay.
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../js/i18n.js';
import { generateIdea } from '../js/ideaEngine.js';

try {
  const { values } = parseArgs({ options: {
    lang: { type: 'string', default: DEFAULT_LANGUAGE },
    seed: { type: 'string' },
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
  const idea = generateIdea({ catalog, language: values.lang, seed: values.seed ?? randomUUID() });
  process.stdout.write(JSON.stringify(idea, null, 2) + '\n');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
