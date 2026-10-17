import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CATEGORIES } from '../js/config.js';
import { createShareUrl, readSharedIdea, resolveSharedIdea, buildShareText, wrapCardText } from '../js/shareData.js';

const catalog = JSON.parse(await readFile(new URL('../data/en/catalog.json', import.meta.url), 'utf8'));
const makeState = () => Object.fromEntries(CATEGORIES.map(c => {
  const count = c.defaultCount ?? 1;
  const options = catalog.categories[c.key].slice(0, count);
  return [c.key, { ids: options.map(v => v.id), values: options.map(v => v.text),
    locked: c.key === 'genres', excluded: c.key === 'settings', count }];
}));

test('share links restore actual values, locks, exclusions, counts and custom Unicode jam themes', () => {
  const state = makeState();
  const values = catalog.categories.core_mechanics.slice(4, 8);
  Object.assign(state.core_mechanics, { ids: values.map(v => v.id), values: values.map(v => v.text), count: 4 });
  const jam = { enabled: true, hours: 72, team: 'small', experience: 'intermediate',
    themeId: null, themeText: 'Ääni 🎲 < & >', themeLocked: true };
  const original = structuredClone({ state, jam });
  const url = createShareUrl(new URL('https://example.org/IdeaGenerator/?seed=old&fresh=1#prompt'),
    { state, jam, catalog, language: 'en' });
  assert.equal(url.pathname, '/IdeaGenerator/');
  assert.equal(url.search, '?lang=en');
  assert.ok(url.hash.startsWith('#idea='));
  const decoded = readSharedIdea(url, ['en', 'fi']);
  const restored = resolveSharedIdea(decoded, catalog);
  assert.deepEqual(restored.fields, state);
  assert.deepEqual(restored.jam, jam);
  assert.deepEqual({ state, jam }, original);
  // Restoring uses current localized text for stable IDs.
  const translated = structuredClone(catalog);
  translated.categories.genres[0].text = 'Translated label';
  assert.equal(resolveSharedIdea(decoded, translated).fields.genres.values[0], 'Translated label');
});

test('sharing retains Easy mode without changing the underlying idea snapshot', () => {
  const model={state:makeState(),catalog,language:'en'};
  const normal=createShareUrl('https://example.org/?seed=test',model);
  const easy=createShareUrl('https://example.org/?easy=1&seed=test',model);
  assert.equal(easy.searchParams.get('easy'),'1');
  assert.deepEqual(readSharedIdea(easy,['en']),readSharedIdea(normal,['en']));
  assert.equal(createShareUrl('https://example.org/?easy=0',model).searchParams.has('easy'),false);
});

test('corrupt and unavailable snapshots fail without modifying application state', () => {
  assert.equal(readSharedIdea(new URL('https://example.org/#prompt'), ['en']), null);
  for (const hash of ['#idea=', '#idea=***', '#idea=aaaaa', '#idea=' + 'a'.repeat(16001)]) {
    assert.throws(() => readSharedIdea(new URL('https://example.org/' + hash), ['en']));
  }
  const url = createShareUrl('https://example.org/', { state: makeState(), catalog, language: 'en' });
  const decoded = readSharedIdea(url, ['en']);
  assert.throws(() => readSharedIdea(url, ['fi']), /Unsupported/);
  const invalid = structuredClone(decoded);
  invalid.fields.genres[0][0] = 'missing-option';
  assert.throws(() => resolveSharedIdea(invalid, catalog), /Unavailable/);
  invalid.fields.genres[3] = 99;
  assert.throws(() => resolveSharedIdea(invalid, catalog), /Invalid/);
  assert.equal(resolveSharedIdea(decoded, catalog).fields.genres.values.length, 2);
});

test('copy text contains all included values, jam context and a generator link', () => {
  const model = { title: 'My game idea', credit: 'Made with Game Idea Generator', empty: 'No fields selected.',
    generatorUrl: 'https://example.org/IdeaGenerator/', jamLines: ['Game jam: 48 hours', 'Theme: Echo'],
    sections: [{ label: 'Genre', values: ['Puzzle', 'Adventure'] }, { label: 'Goal', values: ['Escape'] }] };
  const text = buildShareText(model);
  assert.ok(text.includes('Genre: Puzzle + Adventure'));
  assert.ok(text.includes('Goal: Escape'));
  assert.ok(text.includes('Theme: Echo'));
  assert.ok(text.endsWith(model.generatorUrl));
  assert.ok(buildShareText({ ...model, sections: [] }).includes('No fields selected.'));
});

test('image text wrapping preserves long words, Unicode and paragraph boundaries', () => {
  const lines = wrapCardText('First line\nÄä🎲' + 'x'.repeat(150), 20, text => Array.from(text).length);
  assert.ok(lines.every(line => Array.from(line).length <= 20));
  assert.equal(lines[0], 'First line');
  assert.equal(lines.slice(1).join(''), 'Ää🎲' + 'x'.repeat(150));
  assert.ok(wrapCardText('A long normal sentence that wraps', 12, text => text.length).every(line => line.length <= 12));
});
