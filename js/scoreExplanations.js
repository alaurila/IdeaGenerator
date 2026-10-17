import { SCORING_CONFIG } from './scoringConfig.js';
import { scoringGroups, scoringPairs, synergyEvidence, contrastEvidence, findConflicts } from './scoring.js';

// Return evidence and template keys only; callers handle translation and display.
export function explainIdea(idea, config = SCORING_CONFIG) {
  const explanations = [];
  const conflict = findConflicts(idea, config)[0];
  if (conflict) explanations.push({key:'smart.explainConflict',
    params:{first:conflict.source.text, second:conflict.target.text}});

  const pairs = scoringPairs(idea, config);
  const strongest = evidence => pairs.map(pair => ({...pair, evidence:evidence(pair.a,pair.b,config)}))
    .filter(pair => pair.evidence.strength > 0)
    .sort((a,b) => b.evidence.strength*b.weight - a.evidence.strength*a.weight)[0];
  const synergy = strongest(synergyEvidence);
  if (synergy) {
    const params = {first:synergy.a.text, second:synergy.b.text};
    if (synergy.evidence.shared.length) explanations.push({key:'smart.explainSynergy',
      params:{...params, tag:synergy.evidence.shared[0]}});
    else {
      const [x,y] = synergy.evidence.supporting[0];
      const [leftTag,rightTag] = synergy.a.tags.includes(x) ? [x,y] : [y,x];
      explanations.push({key:'smart.explainSupport',params:{...params,leftTag,rightTag}});
    }
  }
  const tension = strongest(contrastEvidence);
  if (tension) explanations.push({key:'smart.explainTension',
    params:{first:tension.a.text,second:tension.b.text}});

  const commonness = Object.values(scoringGroups(idea,config)).flat().map(option=>option.commonness)
    .filter(value=>Number.isFinite(value) && value >= 0 && value <= 1);
  if (commonness.length) {
    const average = commonness.reduce((sum,value)=>sum+value,0)/commonness.length;
    explanations.push({key:average<0.45 ? 'smart.explainRare' : 'smart.explainNovelty',
      params:{commonness:Math.round(average*100)}});
  }
  return explanations.slice(0,3);
}

export function formatExplanation({key,params}, translate) {
  const translated = {...params};
  for (const name of ['tag','leftTag','rightTag']) {
    if (name in translated) translated[name] = translate(`smart.tag.${translated[name]}`);
  }
  return translate(key,translated);
}
