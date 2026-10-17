import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectOptions } from '../js/ideaEngine.js';

const read = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
test('smart metadata covers exactly five categories with a small shared English vocabulary', async () => {
  const metadata = await read('data/smart_metadata.json');
  assert.deepEqual(Object.keys(metadata.categories), ['genres','settings','core_mechanics','moods','twists']);
  assert.ok(metadata.tags.length >= 30 && metadata.tags.length <= 50);
  const vocabulary = new Set(metadata.tags);
  for (const [key, values] of Object.entries(metadata.categories)) {
    const englishIds = collectOptions(await read(`data/en/${key}.json`)).map(v => v.id);
    assert.deepEqual(Object.keys(values), englishIds);
    for (const entry of Object.values(values)) {
      assert.ok(entry.tags.length >= 2 && entry.tags.length <= 5);
      assert.equal(new Set(entry.tags).size, entry.tags.length);
      assert.ok([...entry.tags,...entry.contrasts,...(entry.conflicts ?? [])].every(tag => vocabulary.has(tag)));
      assert.ok(entry.contrasts.every(tag => !entry.tags.includes(tag)));
      assert.ok(Number.isFinite(entry.commonness) && entry.commonness >= 0 && entry.commonness <= 1);
    }
    for (const language of ['fi','es','pt','fr']) {
      assert.deepEqual(collectOptions(await read(`data/${language}/${key}.json`)).map(v => v.id), englishIds);
    }
  }
});
