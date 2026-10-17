import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { CATEGORIES } from '../js/config.js';
import { LANGUAGES } from '../js/i18n.js';
import { collectOptions, generateIdea, translateSelections, SCHEMA_VERSION, GENERATOR_VERSION } from '../js/ideaEngine.js';
import { readIdeaUrl, updateIdeaUrl, readEasyUrl, updateEasyUrl } from '../js/ideaUrl.js';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));

test('generation is deterministic, uses real values and leaves its input untouched', async () => {
  const catalog = { schemaVersion: SCHEMA_VERSION, language: 'fi', catalogVersion: 'test-catalog',
    categories: Object.fromEntries(await Promise.all(CATEGORIES.map(async c =>
      [c.key, collectOptions(await readJson(`data/fi/${c.file}`))]))) };
  const original = structuredClone(catalog);
  const options = { catalog, language: 'fi', seed: 'ääkköset 🎲' };
  const idea = generateIdea(options);
  assert.deepEqual(idea, generateIdea(options));
  assert.notDeepEqual(idea.categories, generateIdea({ ...options, seed: 'different' }).categories);
  assert.deepEqual(catalog, original);
  for (const c of CATEGORIES) {
    const values = idea.categories[c.key];
    assert.equal(values.length, c.defaultCount ?? 1);
    assert.equal(new Set(values.map(v => v.id)).size, values.length);
    assert.ok(values.every(value => catalog.categories[c.key].some(v => v.id === value.id && v.text === value.text)));
  }
  assert.equal(idea.schemaVersion, SCHEMA_VERSION);
  assert.equal(idea.generatorVersion, GENERATOR_VERSION);
  assert.equal(idea.catalogVersion, catalog.catalogVersion);
  const reordered = structuredClone(catalog);
  for (const values of Object.values(reordered.categories)) values.reverse();
  assert.deepEqual(idea, generateIdea({ ...options, catalog: reordered }));
  idea.categories.genres[0].text = 'changed';
  assert.deepEqual(catalog, original);
  assert.throws(() => generateIdea({ ...options, catalog: {} }), /catalog/);
  assert.throws(() => generateIdea({ ...options, language: 'en' }), /language/);
  assert.throws(() => generateIdea({ ...options, catalog: { ...catalog, schemaVersion: 999 } }), /version/);
  const duplicate = structuredClone(catalog);
  duplicate.categories.genres.push(duplicate.categories.genres[0]);
  assert.throws(() => generateIdea({ ...options, catalog: duplicate }), /category/);
});

test('translations use IDs after reordering and label changes', () => {
  const previous = [{ id: 'a', text: 'One' }, { id: 'b', text: 'Two' }];
  const next = [{ id: 'b', text: 'Kaksi (korjattu)' }, { id: 'a', text: 'Yksi' }];
  assert.deepEqual(translateSelections(['One', 'Two', 'removed'], previous, next), ['Yksi', 'Kaksi (korjattu)']);
});

test('URL language takes priority and seed survives encoding, including empty seeds', () => {
  const languages = LANGUAGES.map(l => l.code);
  const url = new URL('https://example.org/IdeaGenerator/?other=keep#prompt');
  const shared = updateIdeaUrl(url, 'fi', 'ää + & 🎲');
  assert.deepEqual(readIdeaUrl(shared, languages, 'en'), { language: 'fi', seed: 'ää + & 🎲', fresh: false });
  assert.equal(shared.searchParams.get('other'), 'keep');
  assert.equal(shared.hash, '#prompt');
  assert.equal(url.search, '?other=keep');
  assert.equal(updateIdeaUrl(shared, 'fi').searchParams.has('seed'), false);
  assert.equal(readIdeaUrl(new URL('?lang=bad', url), languages, 'fr').language, 'fr');
  assert.equal(readIdeaUrl(new URL('?seed=', url), languages, 'en').seed, '');
  assert.equal(readIdeaUrl(new URL('?fresh=1&seed=old', url), languages, 'en').fresh, true);
  assert.equal(updateIdeaUrl(new URL('?fresh=1', url), 'fi', 'new').searchParams.has('fresh'), false);
});

test('Easy mode URL changes preserve replay parameters, Unicode jam themes and snapshots', () => {
  const url = new URL('https://example.org/?lang=fi&seed=my-idea&jam=1&hours=48&other=keep#idea=snapshot');
  url.searchParams.set('theme','Ääni & valo 🎲');
  const original=url.href;
  const enabled=updateEasyUrl(url,true);
  assert.equal(readEasyUrl(enabled),true);
  for(const [key,value] of url.searchParams)assert.equal(enabled.searchParams.get(key),value);
  assert.equal(enabled.hash,url.hash);
  assert.deepEqual(readIdeaUrl(enabled,['en','fi'],'en'),readIdeaUrl(url,['en','fi'],'en'));
  assert.equal(updateEasyUrl(enabled,false).href,original);
  assert.equal(url.href,original);
  for(const query of ['','?easy=0','?easy=true','?easy=invalid'])assert.equal(readEasyUrl(new URL(query,url)),false);
});

test('published catalogs preserve IDs and bot entry points request fresh generation', async () => {
  for (const { code } of LANGUAGES) {
    const catalog = await readJson(`data/${code}/catalog.json`);
    for (const c of CATEGORIES) {
      const source = collectOptions(await readJson(`data/${code}/${c.file}`))
        .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      assert.deepEqual(catalog.categories[c.key].map(({ id, text }) => ({ id, text })), source);
      const english = await readJson('data/en/catalog.json');
      assert.deepEqual(catalog.categories[c.key].map(v => v.id), english.categories[c.key].map(v => v.id));
    }
  }
  const homepage = await readFile(new URL('index.html', root), 'utf8');
  const guide = await readFile(new URL('api.html', root), 'utf8');
  assert.ok(homepage.includes('href="api.html"'));
  assert.ok(homepage.includes('fresh=1'));
  assert.ok(homepage.includes('id="idea-output"'));
  assert.ok(!homepage.includes('href="ideas/'));
  assert.ok(!guide.includes('href="ideas/'));
  assert.ok(guide.includes('crypto.randomUUID()'));
  assert.ok(homepage.includes('name="description"'));
  assert.ok(!guide.includes('<script'));
  assert.ok(guide.includes('href="./?lang=en&amp;seed=my-idea-123"'));
});

test('saved selections survive label edits and language switches by ID; old storage still loads', async () => {
  const originalGlobals = { fetch: globalThis.fetch, document: globalThis.document, localStorage: globalThis.localStorage };
  const storage = new Map();
  const fi = await readJson('data/fi/catalog.json');
  const en = await readJson('data/en/catalog.json');
  try {
    globalThis.document = { documentElement: {} };
    globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
    globalThis.fetch = async path => ({ ok: true, json: async () =>
      path === 'data/fi/catalog.json' ? fi : path === 'data/en/catalog.json' ? en : {} });
    const loader = await import('../js/dataLoader.js');
    const { state, initState } = await import('../js/state.js');
    const { newIdea, exampleIdea, rollAll, toggleExcluded, translateValues } = await import('../js/generator.js');
    const { loadLanguage } = await import('../js/i18n.js');
    await loadLanguage('fi');
    await loader.loadAllLists('fi');
    initState(); newIdea('saved-identity');
    const selectedId = state.player_roles.ids[0];
    const option = fi.categories.player_roles.find(v => v.id === selectedId);
    option.text = 'Korjattu roolin nimi';
    await loader.loadAllLists('fi');
    assert.equal(initState(), true);
    assert.deepEqual(state.player_roles.values, ['Korjattu roolin nimi']);
    en.categories.player_roles.reverse();
    const oldCatalog = loader.catalog;
    await loader.loadAllLists('en');
    translateValues(oldCatalog);
    assert.deepEqual(state.player_roles.ids, [selectedId]);
    assert.deepEqual(state.player_roles.values, [en.categories.player_roles.find(v => v.id === selectedId).text]);
    const legacy = JSON.parse(storage.get('gameIdeaGenerator.state.v1'));
    for (const entry of Object.values(legacy)) delete entry.ids;
    storage.set('gameIdeaGenerator.state.v1', JSON.stringify(legacy));
    const expected = [...state.player_roles.values];
    assert.equal(initState(), true);
    assert.deepEqual(state.player_roles.values, expected);

    await loadLanguage('en');
    exampleIdea();
    const locked = Object.keys(state).filter(key => state[key].locked);
    const excluded = Object.keys(state).filter(key => state[key].excluded);
    assert.ok(locked.length === 2 || locked.length === 3);
    assert.ok(excluded.length === 2 || excluded.length === 3);
    assert.ok(locked.every(key => !state[key].excluded && state[key].values.length));
    assert.ok(['genres', 'main_goals', 'twists'].every(key => !state[key].excluded));
    const kept = Object.fromEntries([...locked, ...excluded].map(key => [key, [...state[key].values]]));
    rollAll();
    for (const [key, values] of Object.entries(kept)) assert.deepEqual(state[key].values, values);
    const savedExample = structuredClone(state);
    assert.equal(initState(), true);
    assert.deepEqual(state, savedExample);
    toggleExcluded(excluded[0]);
    assert.equal(state[excluded[0]].excluded, false);
    assert.ok(state[excluded[0]].values.length);
    newIdea('explicit-replay');
    assert.ok(Object.values(state).every(entry => !entry.locked && !entry.excluded && entry.values.length));
  } finally {
    for (const [key, value] of Object.entries(originalGlobals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});


test('CLI generates a fresh seed by default and replays explicit seeds', async () => {
  const run = (...args) => JSON.parse(execFileSync(process.execPath,
    ['scripts/generate-idea.js', '--lang', 'fi', ...args], { cwd: root, encoding: 'utf8' }));
  const defaultIdea = JSON.parse(execFileSync(process.execPath, ['scripts/generate-idea.js'], { cwd: root, encoding: 'utf8' }));
  assert.equal(defaultIdea.language, 'en');
  const first = run();
  const second = run();
  assert.notEqual(first.seed, second.seed);
  assert.deepEqual(first, run('--seed', first.seed));
  assert.deepEqual(first, generateIdea({ catalog: await readJson('data/fi/catalog.json'), language: 'fi', seed: first.seed }));
});
