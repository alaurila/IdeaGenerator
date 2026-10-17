import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { CATEGORIES } from '../js/config.js';
import { generateIdea } from '../js/ideaEngine.js';
import { generateSmartIdea, SMART_GENERATION_VERSION } from '../js/smartGeneration.js';
import { scoreIdea } from '../js/scoring.js';
import { explainIdea, formatExplanation } from '../js/scoreExplanations.js';
import { jamSelectionOptions } from '../js/jamPolicy.js';

const root = new URL('../',import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path,root),'utf8'));
const catalog = await read('data/en/catalog.json');
const exec = promisify(execFile);
const run = async (...args) => exec(process.execPath,['scripts/generate-idea.js',...args],{cwd:root,encoding:'utf8'});
const cli = async (...args) => JSON.parse((await run(...args)).stdout);

test('seeded smart generation is reproducible, order-independent and leaves the catalog unchanged',async()=>{
  const options={catalog,language:'en',seed:'smart-replay'};
  const original=structuredClone(catalog);
  const result=await generateSmartIdea(options);
  assert.deepEqual(await generateSmartIdea(options),result);
  const reordered=structuredClone(catalog);
  Object.values(reordered.categories).forEach(values=>values.reverse());
  assert.deepEqual(await generateSmartIdea({...options,catalog:reordered}),result);
  assert.deepEqual(catalog,original);
  assert.equal(result.smart.version,SMART_GENERATION_VERSION);
  assert.equal(result.smart.evaluated,500);
  assert.deepEqual(result.scores,scoreIdea(result));
  assert.ok(result.scores.total>=scoreIdea(generateIdea(options)).total);
  assert.deepEqual(result.explanations,explainIdea(result));
  for(const category of CATEGORIES){
    const values=result.categories[category.key];
    assert.equal(values.length,category.defaultCount??1);
    assert.ok(values.every(value=>catalog.categories[category.key].some(v=>v.id===value.id&&v.text===value.text)));
  }
  result.categories.genres[0].tags.push('changed');
  assert.deepEqual(catalog,original);
});

test('smart generation retains jam scope, theme and requested counts',async()=>{
  const options={catalog,language:'en',seed:'',counts:{genres:4,core_mechanics:4,moods:4,twists:4},
    jam:{enabled:true,hours:24,team:'solo',experience:'beginner',themeText:'Ääni & valo 🎲',themeLocked:true}};
  const result=await generateSmartIdea(options);
  assert.deepEqual(result.jam,generateIdea(options).jam);
  for(const {key,defaultCount} of CATEGORIES){
    const count=options.counts[key]??defaultCount??1;
    assert.equal(result.categories[key].length,count);
    assert.ok(result.categories[key].every(value=>jamSelectionOptions(catalog,key,result.jam,count).some(v=>v.id===value.id)));
  }
  assert.deepEqual(await generateSmartIdea(options),result);
});

test('CLI --smart provides fresh seeds and replays complete localized JSON',async()=>{
  const english=await cli('--smart');
  assert.equal(english.language,'en');
  const first=await cli('--smart','--lang','fi');
  const second=await cli('--smart','--lang','fi');
  assert.notEqual(first.seed,second.seed);
  assert.deepEqual(await cli('--smart','--lang','fi','--seed',first.seed),first);
  assert.deepEqual(first.scores,scoreIdea(first));
  assert.ok(first.explanations.length>=1&&first.explanations.length<=3);
  const strings=await read('lang/fi.json');
  const translate=(key,params={})=>strings[key].replace(/\{(\w+)\}/g,(match,name)=>params[name]??match);
  for(const explanation of first.explanations){
    assert.equal(explanation.text,formatExplanation(explanation,translate));
    assert.ok(!/\{\w+\}|smart\./.test(explanation.text));
  }
  const ordinary=await cli('--seed',english.seed);
  assert.equal('smart' in ordinary,false);
  assert.equal('scores' in ordinary,false);
  assert.deepEqual(ordinary,generateIdea({catalog,language:'en',seed:english.seed}));
});

test('CLI --smart supports served catalogs and jam options; outdated catalogs fail clearly',async t=>{
  const legacy=structuredClone(catalog);
  for(const values of Object.values(legacy.categories))for(const value of values){
    delete value.tags;delete value.contrasts;delete value.commonness;delete value.conflicts;
  }
  const server=createServer((request,response)=>{
    response.setHeader('Content-Type','application/json');
    response.end(JSON.stringify(request.url==='/legacy.json'?legacy:catalog));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}`;
  const args=['--smart','--seed','served-jam','--jam','--hours','24','--theme','Ääni & valo 🎲'];
  assert.deepEqual(await cli(...args,'--catalog-url',`${url}/catalog.json`),await cli(...args));
  await assert.rejects(run('--smart','--catalog-url',`${url}/legacy.json`),error=>{
    assert.equal(error.stdout,'');
    assert.match(error.stderr,/requires scoring metadata.*updated catalog/);
    return true;
  });
  assert.equal((await cli('--catalog-url',`${url}/legacy.json`)).language,'en');
  const partial=structuredClone(catalog);
  delete partial.categories.core_mechanics[0].contrasts;
  await assert.rejects(generateSmartIdea({catalog:partial,language:'en',seed:'partial'}),
    /requires scoring metadata for core_mechanics/);
});
