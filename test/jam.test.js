import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { CATEGORIES } from '../js/config.js';
import { generateIdea } from '../js/ideaEngine.js';
import { jamOptions, jamLevel, normalizeJam, JAM_DEFAULTS } from '../js/jamPolicy.js';
import { readJamUrl, updateJamUrl } from '../js/ideaUrl.js';

const readJson = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));

test('all 300 themes have unique text and matching permanent IDs in all five languages', async () => {
  let ids;
  for (const language of ['en', 'fi', 'es', 'pt', 'fr']) {
    const themes = await readJson(`data/${language}/jam_themes.json`);
    assert.equal(themes.length, 300);
    assert.equal(new Set(themes.map(v => v.id)).size, 300);
    assert.equal(new Set(themes.map(v => v.text.toLowerCase())).size, 300);
    assert.ok(themes.every(v => v.text.trim() && !v.text.includes('|')));
    if (ids) assert.deepEqual(themes.map(v => v.id), ids);
    ids = themes.map(v => v.id);
  }
});

test('jam generation is deterministic, uses normal counts and respects all constraint combinations', async () => {
  const catalog = await readJson('data/en/catalog.json');
  for (const hours of [24, 48, 72, 168]) for (const team of ['solo', 'small', 'large'])
    for (const experience of ['beginner', 'intermediate', 'experienced']) {
      const jam = normalizeJam({ enabled: true, hours, team, experience });
      const options = { catalog, language: 'en', seed: `${hours}-${team}-${experience}`, jam };
      const idea = generateIdea(options);
      assert.deepEqual(idea, generateIdea(options));
      assert.ok(catalog.jam.themes.some(v => v.id === idea.jam.theme.id));
      for (const { key, defaultCount } of CATEGORIES) {
        assert.equal(idea.categories[key].length, defaultCount ?? 1);
        const pool = jamOptions(catalog, key, jam);
        assert.ok(pool.some(v => v.id === idea.categories[key][0].id));
        if (catalog.jam.constrainedCategories.includes(key)) assert.ok(pool.every(v => v.jam.level <= jamLevel(jam)));
      }
    }
  assert.ok(jamOptions(catalog, 'genres', { ...JAM_DEFAULTS, enabled: true }).every(v => v.text !== 'MMO' && v.text !== 'MMORPG'));
  const beginner = jamOptions(catalog, 'genres', { ...JAM_DEFAULTS, enabled: true });
  const advanced = jamOptions(catalog, 'genres', normalizeJam({ enabled: true, hours: 168, team: 'large', experience: 'experienced' }));
  assert.ok(advanced.length > beginner.length);
  const options = { catalog, language: 'en', seed: 'reordered-themes', jam: { enabled: true } };
  const reordered = structuredClone(catalog);
  reordered.jam.themes.reverse();
  assert.deepEqual(generateIdea(options), generateIdea({ ...options, catalog: reordered }));
});

test('all jam configurations honor chosen counts even when the preferred pool has fewer options', async () => {
  const catalog = await readJson('data/en/catalog.json');
  const counts = Object.fromEntries(CATEGORIES.filter(c => c.multi).map(c => [c.key, 4]));
  for (const hours of [24, 48, 72, 168]) for (const team of ['solo', 'small', 'large'])
    for (const experience of ['beginner', 'intermediate', 'experienced']) {
      const idea = generateIdea({ catalog, language: 'en', seed: 'four-values', counts,
        jam: { enabled: true, hours, team, experience } });
      for (const { key, multi } of CATEGORIES) {
        const values = idea.categories[key];
        assert.equal(values.length, multi ? 4 : 1);
        assert.equal(new Set(values.map(v => v.id)).size, values.length);
      }
    }
});

test('locked and custom themes survive seeded generation and translate by ID', async () => {
  const catalog = await readJson('data/en/catalog.json');
  const jam = { enabled: true, themeId: 'jam_theme-0004', themeLocked: true };
  const idea = generateIdea({ catalog, language: 'en', seed: 'test', jam });
  assert.deepEqual(idea.jam.theme, { id: 'jam_theme-0004', text: 'Echo' });
  const fi = await readJson('data/fi/catalog.json');
  const translated = generateIdea({ catalog: fi, language: 'fi', seed: 'test', jam });
  assert.deepEqual(translated.jam.theme, { id: 'jam_theme-0004', text: 'Kaiku' });
  assert.deepEqual(Object.values(idea.categories).map(v => v[0].id), Object.values(translated.categories).map(v => v[0].id));
  const custom = generateIdea({ catalog, language: 'en', seed: 'test', jam: { enabled: true, themeText: '<My own theme> & hope', themeLocked: true } });
  assert.deepEqual(custom.jam.theme, { id: null, text: '<My own theme> & hope' });
  assert.throws(() => generateIdea({ catalog, language: 'en', seed: 'test', jam: { ...jam, themeId: 'missing' } }), /theme/);
  assert.throws(() => normalizeJam({ hours: 5 }), /constraints/);
});

test('jam URLs round-trip Unicode custom themes and preserve unrelated parameters', () => {
  const url = new URL('https://example.org/?lang=fi&seed=test#prompt');
  const jam = normalizeJam({ enabled: true, hours: 72, team: 'small', experience: 'intermediate',
    themeText: 'Ääni & valo / 🎲', themeLocked: true });
  const shared = updateJamUrl(url, jam);
  assert.deepEqual(readJamUrl(shared), jam);
  assert.equal(shared.searchParams.get('seed'), 'test');
  assert.equal(shared.hash, '#prompt');
  const disabled = updateJamUrl(shared, JAM_DEFAULTS);
  assert.equal(disabled.searchParams.has('jam'), false);
  assert.equal(disabled.searchParams.has('theme'), false);
});

test('CLI can generate and replay scoped jam ideas', () => {
  const run = (...args) => JSON.parse(execFileSync(process.execPath,
    ['scripts/generate-idea.js', '--jam', '--theme', 'Echo', ...args], { cwd: new URL('../', import.meta.url), encoding: 'utf8' }));
  const first = run();
  assert.equal(first.jam.hours, 48);
  assert.equal(first.jam.theme.text, 'Echo');
  assert.deepEqual(first, run('--seed', first.seed));
});
