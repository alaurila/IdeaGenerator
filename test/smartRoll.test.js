import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CATEGORIES } from '../js/config.js';
import { createCandidateFactory, findSmartIdea } from '../js/smartRoll.js';
import { scoreIdea } from '../js/scoring.js';
import { SCORING_CONFIG } from '../js/scoringConfig.js';
import { JAM_DEFAULTS, jamSelectionOptions } from '../js/jamPolicy.js';

const catalog = JSON.parse(await readFile(new URL('../data/en/catalog.json', import.meta.url), 'utf8'));
const makeState = (count = 1) => Object.fromEntries(CATEGORIES.map(({key}) => [key, {
  values:catalog.categories[key].slice(0,count).map(v => v.text),
  ids:catalog.categories[key].slice(0,count).map(v => v.id), count, locked:false, excluded:false
}]));
const seeded = () => { let value=42; return () => ((value=Math.imul(value,1664525)+1013904223>>>0)/2**32); };

test('smart candidates preserve locks, exclusions, counts and inputs in game jam mode', async () => {
  const state = makeState(4);
  state.genres.locked = true;
  state.moods.excluded = true;
  const original = structuredClone(state);
  const jam = {...JAM_DEFAULTS, enabled:true, hours:24};
  const beforeJam = structuredClone(jam);
  const factory = createCandidateFactory({state,catalog,jam,random:seeded()});
  const candidate = factory.next();
  for (const {key} of CATEGORIES) {
    const values = candidate.categories[key];
    if (state[key].excluded) { assert.deepEqual(values,[]); continue; }
    assert.equal(values.length,4);
    assert.equal(new Set(values.map(v=>v.text)).size,4);
    if (state[key].locked) assert.deepEqual(values.map(v=>v.id),state[key].ids);
    else assert.ok(values.every(v=>jamSelectionOptions(catalog,key,jam,4).some(option=>option.id===v.id)));
  }
  const result = await findSmartIdea({state,catalog,jam,random:seeded(),candidateCount:60});
  assert.equal(result.evaluated,60);
  assert.ok(result.scores.total >= scoreIdea(factory.baseline).total);
  assert.ok(result.finalists.length <= 10);
  assert.deepEqual(state,original);
  assert.deepEqual(jam,beforeJam);
});

test('smart search selects within its top shortlist rather than always selecting the highest score', async () => {
  const state = makeState();
  let progress=0;
  const rng = seeded();
  const result = await findSmartIdea({state,catalog, candidateCount:80, topCount:10,
    random:()=>progress===80 ? 0.999999 : rng(),onProgress:value=>{progress=value;}});
  assert.equal(result.changed,true);
  assert.equal(result.finalists.length,10);
  assert.deepEqual(result.scores,result.finalists.at(-1));
  assert.ok(result.finalists.every((v,i,list)=>!i || v.total<=list[i-1].total));
  assert.deepEqual(result.scores,scoreIdea(result.idea));
});

test('fully locked or excluded scored fields return without changing the idea', async () => {
  const state=makeState();
  SCORING_CONFIG.categories.forEach(key=>{state[key].locked=true;});
  const result=await findSmartIdea({state,catalog});
  assert.equal(result.changed,false);
  assert.equal(result.reason,'noEditable');
  assert.equal(result.evaluated,0);
});

test('pending smart search can be canceled between batches', async () => {
  const controller=new AbortController();
  await assert.rejects(findSmartIdea({state:makeState(),catalog,candidateCount:100,
    signal:controller.signal,onProgress:()=>controller.abort()}),{name:'AbortError'});
});

test('search keeps the original when every candidate scores lower', async () => {
  const synthetic={categories:Object.fromEntries(CATEGORIES.map(({key})=>[key,
    [0,1].map(index=>({id:`${key}-${index}`,text:`${key}-${index}`,
      ...(SCORING_CONFIG.categories.includes(key) ? {tags:['management'],contrasts:[],commonness:index} : {})}))]))};
  const state=Object.fromEntries(CATEGORIES.map(({key})=>[key,{values:[`${key}-0`],ids:[`${key}-0`],
    count:1,locked:false,excluded:false}]));
  const original=structuredClone(state);
  const result=await findSmartIdea({state,catalog:synthetic,candidateCount:30});
  assert.equal(result.changed,false);
  assert.equal(result.reason,'noImprovement');
  assert.equal(result.scores.total,70);
  assert.deepEqual(state,original);
});
