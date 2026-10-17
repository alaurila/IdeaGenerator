import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CATEGORIES } from '../js/config.js';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../js/i18n.js';
import { collectOptions, generateIdea, SCHEMA_VERSION } from '../js/ideaEngine.js';
import { escapeHtml } from '../js/dom.js';
import { JAM_POLICY_VERSION } from '../js/jamPolicy.js';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const write = (path, text) => writeFile(new URL(path, root), text, 'utf8');
const json = value => JSON.stringify(value, null, 2) + '\n';

let referenceIds;
let referenceThemeIds;
const profiles = await readJson('data/jam_profiles.json');
for (const { code } of LANGUAGES) {
  const strings = await readJson(`lang/${code}.json`);
  const catalog = Object.fromEntries(await Promise.all(CATEGORIES.map(async c =>
    [c.key, collectOptions(await readJson(`data/${code}/${c.file}`))
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)])));
  for (const { key } of CATEGORIES) {
    const options = catalog[key];
    if (!options.length || options.some(v => !v.id || !v.text) ||
        new Set(options.map(v => v.id)).size !== options.length) {
      throw new Error(`Invalid or duplicate option IDs: ${code}/${key}`);
    }
    const profiled = new Set();
    for (const [level, numbers] of Object.entries(profiles[key] ?? {})) {
      for (const number of numbers) {
        const id = `${key}-${String(number).padStart(4, '0')}`;
        const option = options.find(v => v.id === id);
        if (!option || profiled.has(id)) throw new Error(`Invalid jam profile: ${id}`);
        option.jam = { level: Number(level), tags: ['smallScope', ...(level === '0' ? ['beginnerFriendly'] : [])] };
        profiled.add(id);
      }
    }
  }
  const jamThemes = collectOptions(await readJson(`data/${code}/jam_themes.json`)).sort((a, b) => a.id < b.id ? -1 : 1);
  if (jamThemes.length !== 300 || new Set(jamThemes.map(v => v.id)).size !== 300 ||
      new Set(jamThemes.map(v => v.text.toLowerCase())).size !== 300 || jamThemes.some(v => !v.text)) {
    throw new Error(`Expected 300 unique game jam themes: ${code}`);
  }
  const themeIds = JSON.stringify(jamThemes.map(v => v.id));
  if (referenceThemeIds && referenceThemeIds !== themeIds) throw new Error(`Theme translation IDs do not match: ${code}`);
  referenceThemeIds = themeIds;
  const ids = JSON.stringify(Object.fromEntries(CATEGORIES.map(c => [c.key, catalog[c.key].map(v => v.id)])));
  if (referenceIds && referenceIds !== ids) throw new Error(`Translation IDs do not match: ${code}`);
  referenceIds = ids;
  const jam = { policyVersion: JAM_POLICY_VERSION, constrainedCategories: Object.keys(profiles), themes: jamThemes };
  const catalogVersion = createHash('sha256').update(JSON.stringify({ categories: catalog, jam })).digest('hex');
  const metadata = { schemaVersion: SCHEMA_VERSION, language: code, catalogVersion };
  const document = {
    ...metadata,
    labels: Object.fromEntries(CATEGORIES.map(c => [c.key, strings[`category.${c.key}`]])),
    categories: catalog,
    jam
  };
  await write(`data/${code}/catalog.json`, json(document));
  if (code === DEFAULT_LANGUAGE) {
    const path = new URL('index.html', root);
    const homepage = await readFile(path, 'utf8');
    const example = generateIdea({ catalog: document, language: code, seed: 'example-1' });
    const fields = ['player_roles', 'main_goals', 'core_mechanics'].map(key =>
      `<dt>${escapeHtml(strings[`category.${key}`])}</dt><dd>${example.categories[key].map(v => escapeHtml(v.text)).join(' + ')}</dd>`
    ).join('\n');
    const snippet = `<!-- static-example:start -->
    <details lang="en">
      <summary>Example game idea format</summary>
      <p>This is a fixed documentation example. <a href="?lang=en&amp;fresh=1">Generate a fresh idea</a>.</p>
      <dl>${fields}</dl>
      <p><a href="?lang=en&amp;seed=${example.seed}">Replay this fixed example</a></p>
    </details>
    <!-- static-example:end -->`;
    if (!homepage.includes('<!-- static-example:start -->')) throw new Error('Missing homepage example marker');
    await writeFile(path, homepage.replace(/<!-- static-example:start -->[\s\S]*?<!-- static-example:end -->/, snippet), 'utf8');
  }
}
console.log(`Built a catalog for each of ${LANGUAGES.length} languages.`);
