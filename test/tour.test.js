import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { placeTourBubble } from '../js/tourPosition.js';

const rect = (left,top,width,height) => ({left,top,width,height,right:left+width,bottom:top+height});

test('tour bubbles stay within the viewport and avoid their targets at edges and on mobile',()=>{
  const scenarios = [
    [{width:1440,height:900},rect(26,78,80,30),{width:340,height:240}],
    [{width:1440,height:900},rect(1250,78,160,36),{width:340,height:240}],
    [{width:390,height:844},rect(16,100,85,30),{width:340,height:300}],
    [{width:390,height:844},rect(270,760,100,30),{width:340,height:300}],
    [{width:844,height:390},rect(410,170,90,36),{width:340,height:260}]
  ];
  for(const [viewport,anchor,bubble] of scenarios){
    const result=placeTourBubble(anchor,bubble,viewport);
    assert.ok(result.x>=12 && result.x+bubble.width<=viewport.width-12);
    assert.ok(result.y>=12 && result.y+bubble.height<=viewport.height-12);
    assert.ok(result.x+bubble.width<=anchor.left || result.x>=anchor.right ||
      result.y+bubble.height<=anchor.top || result.y>=anchor.bottom);
    const horizontal=['top','bottom'].includes(result.side);
    assert.ok(result.arrow>=20 && result.arrow<=(horizontal?bubble.width:bubble.height)-20);
  }
});

test('tour bubble remains reachable when a tiny viewport cannot fit beside its target',()=>{
  const result=placeTourBubble(rect(130,110,60,30),{width:296,height:216},{width:320,height:240});
  assert.equal(result.x,12);
  assert.equal(result.y,12);
  assert.ok(Number.isFinite(result.arrow));
});

test('all tour steps and controls have matching translations in all five languages',async()=>{
  const strings=await Promise.all(['en','fi','es','pt','fr'].map(async language=>
    JSON.parse(await readFile(new URL(`../lang/${language}.json`,import.meta.url),'utf8'))));
  const keys=Object.keys(strings[0]).filter(key=>key.startsWith('tour.'));
  for(const dictionary of strings){
    assert.deepEqual(Object.keys(dictionary).filter(key=>key.startsWith('tour.')).sort(),[...keys].sort());
    for(const key of keys){
      assert.ok(typeof dictionary[key]==='string' && dictionary[key].length);
      assert.deepEqual(dictionary[key].match(/\{\w+\}/g)?.sort(),strings[0][key].match(/\{\w+\}/g)?.sort());
    }
  }
});
