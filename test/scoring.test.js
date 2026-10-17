import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreIdea, buildScoringIdea, totalScore } from '../js/scoring.js';
import { SCORING_CONFIG } from '../js/scoringConfig.js';

const option = (id, tags, extra = {}) => ({ id, text: id, tags, contrasts: [], commonness: 0.5, ...extra });
const idea = categories => ({ categories });

test('shared and supporting tags increase synergy without mutating inputs', () => {
  const aligned = idea({ genres: [option('manager',['management','people'])],
    core_mechanics: [option('tracking',['management','people','information'])] });
  const unrelated = idea({ genres: aligned.categories.genres,
    core_mechanics: [option('sound',['music','physics'])] });
  const original = structuredClone(aligned);
  assert.ok(scoreIdea(aligned).synergy > scoreIdea(unrelated).synergy);
  assert.ok(scoreIdea(aligned).synergy >= 75);
  assert.deepEqual(aligned, original);
});

test('genre-mechanic relationships outweigh genre-setting relationships', () => {
  const mechanics = idea({ genres: [option('g',['combat','action'])],
    core_mechanics: [option('m',['combat','action'])], settings: [option('s',['music','nature'])] });
  const setting = idea({ genres: mechanics.categories.genres,
    core_mechanics: mechanics.categories.settings, settings: mechanics.categories.core_mechanics });
  assert.ok(scoreIdea(mechanics).synergy > scoreIdea(setting).synergy);
});

test('sparse and legacy ideas are safe; irrelevant categories do not affect scores', () => {
  assert.deepEqual(scoreIdea({}), { synergy: 0, tension: 0, novelty: 0, conflict: 0, total: 0 });
  assert.equal(scoreIdea(idea({genres:['Legacy string']})).synergy, 0);
  assert.deepEqual(scoreIdea(idea({main_goals:[option('ignored',['combat'])]})), scoreIdea({}));
});

test('excluded fields are omitted from UI scoring and stable IDs resolve metadata', () => {
  const catalog = { categories: { genres: [option('g',['combat','action'])], moods: [option('m',['cozy','relaxation'])] } };
  const state = { genres: { values:['g'], ids:['g'] }, moods: { values:['m'], ids:['m'], excluded:true } };
  const scored = buildScoringIdea(state, catalog);
  assert.deepEqual(scored.categories.genres, catalog.categories.genres);
  assert.deepEqual(scored.categories.moods, []);
});

test('all output scores remain finite and bounded; repeated selections do not stack', () => {
  const g = option('g',['combat','action']);
  const m = option('m',['combat','action']);
  const once = scoreIdea(idea({ genres:[g], core_mechanics:[m] }));
  const duplicate = scoreIdea(idea({ genres:[g,g], core_mechanics:[m,m] }));
  assert.deepEqual(duplicate, once);
  assert.ok(Object.values(once).every(value => Number.isFinite(value) && value >= 0 && value <= 100));
});

test('contrast hits create interesting tension without being treated as conflict', () => {
  const football = option('football',['management','people'], { contrasts:['cyberspace','mythology'] });
  const network = option('network',['cyberspace','technology','systems']);
  const hit = scoreIdea(idea({ genres:[football], settings:[network] }));
  const miss = scoreIdea(idea({ genres:[{ ...football, contrasts:[] }], settings:[network] }));
  assert.ok(hit.tension > miss.tension);
  assert.equal(hit.conflict, 0);
  assert.equal(hit.synergy, miss.synergy);
});

test('contrast matching works in either direction and missing contrast metadata is neutral', () => {
  const a = option('a',['people','management']);
  const b = option('b',['cyberspace','technology'], { contrasts:['management'] });
  assert.ok(scoreIdea(idea({genres:[a],settings:[b]})).tension > 0);
  assert.equal(scoreIdea(idea({genres:[a],settings:[{...b,contrasts:undefined}]})).tension, 0);
});

test('novelty is inverse average commonness without invented common-pair rules', () => {
  const sample = commonness => idea({ genres:[option('g',['combat','action'], {commonness})] });
  assert.equal(scoreIdea(sample(0)).novelty, 100);
  assert.equal(scoreIdea(sample(1)).novelty, 0);
  assert.equal(scoreIdea(sample(0.25)).novelty, 75);
  const mixed = idea({ genres:[option('a',['combat'],{commonness:0.2}), option('b',['people'],{commonness:0.8})] });
  assert.equal(scoreIdea(mixed).novelty, 50);
  for (const invalid of [undefined, NaN, Infinity, -1, 2]) assert.equal(scoreIdea(sample(invalid)).novelty, 0);
});

test('only explicit conflict rules incur a small penalty, without stacking the same target tag', () => {
  const safe = option('safe',['cozy','relaxation'],{conflicts:['permadeath']});
  const risky = option('roguelike',['survival','permadeath']);
  const sample = idea({moods:[safe], genres:[risky]});
  assert.equal(scoreIdea(sample).conflict, 12);
  assert.equal(scoreIdea(idea({moods:[safe],genres:[risky,{...risky,id:'another'}]})).conflict, 12);
  assert.equal(scoreIdea(idea({moods:[{...safe,conflicts:[],contrasts:['permadeath']}],genres:[risky]})).conflict, 0);
});

test('total uses configurable requested weights and clamps the result to 0–100', () => {
  const metrics = {synergy:72,tension:61,novelty:84,conflict:8};
  assert.equal(totalScore(metrics), Math.round(72*0.35+61*0.30+84*0.35-8*0.50));
  assert.equal(totalScore({synergy:0,tension:0,novelty:0,conflict:100}), 0);
  assert.equal(totalScore({synergy:100,tension:100,novelty:100,conflict:0}), 100);
  const config = {...SCORING_CONFIG,totalWeights:{synergy:1,tension:0,novelty:0,conflict:0}};
  assert.equal(totalScore(metrics, config), 72);
  const sample = idea({genres:[option('g',['combat','action'])],core_mechanics:[option('m',['combat','action'])]});
  assert.equal(scoreIdea(sample,config).total,scoreIdea(sample,config).synergy);
});
