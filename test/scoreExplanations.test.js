import test from 'node:test';
import assert from 'node:assert/strict';
import { explainIdea } from '../js/scoreExplanations.js';
import { readFile } from 'node:fs/promises';

const option = (text,tags,extra={})=>({text,tags,contrasts:[],commonness:0.5,...extra});

test('explanations use actual synergy and contrast evidence, with at most three templates',()=>{
  const idea={categories:{genres:[option('Football Manager',['management','people'],{contrasts:['cyberspace']})],
    core_mechanics:[option('Following people',['people','information'])],
    settings:[option('Computer network',['cyberspace','technology'],{commonness:0.3})]}};
  const original=structuredClone(idea);
  const explanations=explainIdea(idea);
  assert.equal(explanations.length,3);
  assert.deepEqual(explanations[0],{key:'smart.explainSynergy',params:{first:'Football Manager',second:'Following people',tag:'people'}});
  assert.deepEqual(explanations[1],{key:'smart.explainTension',params:{first:'Football Manager',second:'Computer network'}});
  assert.equal(explanations[2].key,'smart.explainRare');
  assert.equal(explanations[2].params.commonness,43);
  assert.deepEqual(idea,original);
});

test('related traits explain support without claiming a shared tag',()=>{
  const result=explainIdea({categories:{genres:[option('A',['management'])],core_mechanics:[option('B',['systems'])]}});
  assert.deepEqual(result[0],{key:'smart.explainSupport',params:{first:'A',second:'B',leftTag:'management',rightTag:'systems'}});
});

test('explicit conflicts take priority; unrelated or missing data never invent a match',()=>{
  const result=explainIdea({categories:{moods:[option('Safe',['relaxation'],{conflicts:['permadeath']})],
    genres:[option('Roguelike',['permadeath'])]}});
  assert.equal(result[0].key,'smart.explainConflict');
  assert.equal(result[0].params.first,'Safe');
  const sparse=explainIdea({categories:{genres:[option('A',['people'])],settings:[option('B',['music'])]}});
  assert.deepEqual(sparse,[{key:'smart.explainNovelty',params:{commonness:50}}]);
  assert.deepEqual(explainIdea({}),[]);
  assert.deepEqual(explainIdea({categories:{genres:['legacy']}}),[]);
});

test('every UI language translates all scoring templates and shared vocabulary',async()=>{
  const read=async file=>JSON.parse(await readFile(new URL(`../${file}`,import.meta.url),'utf8'));
  const metadata=await read('data/smart_metadata.json');
  const english=await read('lang/en.json');
  const keys=Object.keys(english).filter(key=>key.startsWith('smart.'));
  for(const lang of ['en','fi','es','pt','fr']){
    const strings=await read(`lang/${lang}.json`);
    for(const key of keys){
      assert.equal(typeof strings[key],'string',`${lang}: ${key}`);
      assert.deepEqual(strings[key].match(/\{\w+\}/g)?.sort(),english[key].match(/\{\w+\}/g)?.sort(),`${lang}: ${key}`);
      assert.ok(!strings[key].includes('\uFFFD'),`${lang}: ${key}`);
    }
    for(const tag of metadata.tags)assert.equal(typeof strings[`smart.tag.${tag}`],'string',`${lang}: ${tag}`);
  }
});
