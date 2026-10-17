// Bootstrap/review aid for the five-category metadata registry. Runtime scoring uses
// the committed IDs and metadata, never translated text or keyword matching.
import { readFile, writeFile } from 'node:fs/promises';
import { collectOptions } from '../js/ideaEngine.js';

const root = new URL('../', import.meta.url);
const rules = [
  ['management', /manag|administr|organiz|logistic|planning|worker|budget|leader|control/],
  ['people', /people|person|npc|character|human|family|friend|football|school|hospital|romant|social|crowd/],
  ['combat', /combat|fight|war\b|battle|shoot|weapon|military|soldier|attack|violence|brutal/],
  ['exploration', /explor|discover|adventur|journey|map|island|cave|forest|ocean|wilderness/],
  ['mystery', /myster|secret|unknown|strange|enigmat|unexplain|uncertain|hidden/],
  ['information', /information|data|document|report|code|knowledge|memory|lies|truth|clue|network|track|following/],
  ['economy', /econom|trad|buy|sell|money|shop|market|financ|business|corporat|bank|profit|tycoon/],
  ['survival', /surviv|hunger|thirst|oxygen|disaster|apocalyp|desperat|danger|threat|death|dead/],
  ['social', /social|relationship|commun|dialog|conversation|negotiat|friend|family|romant|trust|people/],
  ['politics', /politic|govern|nation|election|power|regime|diploma|law|rebell|revolution|totalitarian/],
  ['technology', /techn|computer|robot|machine|program|cyber|digital|software|network|sci.fi|futur/],
  ['cyberspace', /cyber|computer|network|digital|virtual|internet|software|hacking/],
  ['nature', /natur|forest|garden|farm|animal|bird|plant|weather|season|rain|ocean|sea\b|river|mountain|wilderness/],
  ['history', /histor|medieval|ancient|victorian|retro|1950|1990|west\b|steampunk|dieselpunk/],
  ['mythology', /myth|magic|fantasy|legend|god\b|divine|ritual|sacred|occult|supernatural|paranormal|ghost/],
  ['horror', /horror|nightmar|scary|dark|dread|lovecraft|grotesque|creep|fear|paranoi|disturb/],
  ['cozy', /cozy|wholesome|warm|homely|gentle|cute|heartfelt|calm|safe|hopeful/],
  ['competition', /compet|sport|football|racing|race\b|rival|tournament|contest|boxing|win\b/],
  ['strategy', /strateg|tactic|planning|turn.based|chess|decision|resource allocation|football manager/],
  ['automation', /automat|factory|production|machine|robot|circuit|program/],
  ['investigation', /investigat|detective|inspect|evidence|interrogat|following|tracking|analy|diagnos|clue|forensic/],
  ['narrative', /narrat|story|fiction|drama|novel|dialog|conversation|emotional|wistful|melanchol|tragi|philosoph/],
  ['stealth', /stealth|sneak|hiding|infiltrat|spy\b|spying|shadowing|following|eavesdrop/],
  ['construction', /build|construct|craft|repair|assem|placing|connect/],
  ['simulation', /simulat|tycoon|manager|realistic|realism|systematic/],
  ['systems', /system|network|manag|simulat|machine|automat|rule|mechanic|program|logic|resource/],
  ['science', /science|scient|laborator|research|experiment|clinical|chem|biolog|physic/],
  ['time', /time|loop|past|future|history|memory|remember|nostalgi|retro|clock|generation/],
  ['physics', /physic|gravity|weight|momentum|fluid|electric|water|pressure|movement/],
  ['puzzle', /puzzle|matching|logic|riddle|password|pattern|escape room|sokoban|comparing/],
  ['humor', /humor|comedy|comic|absurd|satir|playful|farce|slapstick|deadpan|ironic|kitsch|camp\b/],
  ['ethics', /moral|ethic|choice|decision|sacrific|guilt|justice|cruel|merciless|humane/],
  ['identity', /identity|identities|clone|self.aware|isn't human|not human|posthuman|unreliable narrator/],
  ['space', /space|cosmic|planet|galax|alien|star\b|universe|astronaut|spaceship/],
  ['scarcity', /scarce|resource|surviv|hunger|thirst|limited|last\b|debt|inventory/],
  ['crafting', /craft|cooking|recipe|assembl|combin|repair|making|brew/],
  ['music', /music|rhythm|sound|sing|listen|dance|audio/],
  ['action', /action|shoot|fight|platform|fast|hectic|adrenaline|energetic|movement|racing/],
  ['abstract', /abstract|surreal|weird|unreal|dream|hypnotic|trance|meta\b|fourth.wall|reality/],
  ['permadeath', /\broguelike\b|permadeath/],
  ['relaxation', /relax|calm|slow|peace|safe|meditat|gentle|quiet|cozy/],
  ['bureaucracy', /bureaucr|document|passport|report|form\b|forms\b|application|audit|office|orwell/],
  ['urban', /city|urban|street|apartment|suburb|shop|mall|office|metro|building|town/],
  ['travel', /travel|journey|transport|train|ship|boat|road|car\b|flight|port\b|island|station|navigation/]
];
const defaults = {
  genres: ['action', 'systems'], settings: ['exploration', 'travel'],
  core_mechanics: ['systems', 'information'], moods: ['narrative', 'people'], twists: ['narrative', 'mystery']
};
const contrasts = {
  management: ['cyberspace', 'mythology'], combat: ['cozy', 'relaxation'], cozy: ['horror', 'combat'],
  horror: ['cozy', 'humor'], nature: ['technology', 'cyberspace'], technology: ['nature', 'mythology'],
  cyberspace: ['nature', 'history'], history: ['cyberspace', 'space'], mythology: ['science', 'bureaucracy'],
  economy: ['mythology', 'nature'], politics: ['humor', 'cozy'], bureaucracy: ['mythology', 'humor'],
  humor: ['horror', 'bureaucracy'], simulation: ['abstract', 'mythology'], abstract: ['simulation', 'history'],
  survival: ['cozy', 'social'], competition: ['relaxation', 'mythology'], relaxation: ['competition', 'survival']
};
const categories = {};
for (const key of Object.keys(defaults)) {
  const source = JSON.parse(await readFile(new URL(`data/en/${key}.json`, root), 'utf8'));
  categories[key] = Object.fromEntries(collectOptions(source).map(option => {
    const text = option.text.toLowerCase();
    const matches = rules.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
    const tags = [...new Set([...matches, ...defaults[key]])].slice(0, Math.max(2, Math.min(5, matches.length)));
    const contrastTags = [...new Set(tags.flatMap(tag => contrasts[tag] ?? []))].filter(tag => !tags.includes(tag)).slice(0, 3);
    const unusual = tags.filter(tag => ['cyberspace','mythology','abstract','space','identity','bureaucracy'].includes(tag)).length;
    const broad = /^(action|adventure|puzzle|city|village|cozy|dark|realistic|conversation|trading|building)$/.test(text);
    const commonness = broad ? 0.85 : Math.max(0.15, Math.min(0.8, 0.6 - unusual * 0.1 - (text.split(/\s+/).length > 4 ? 0.1 : 0)));
    return [option.id, { tags, contrasts: contrastTags, commonness: Number(commonness.toFixed(2)) }];
  }));
}
// Reviewed anchors for the examples and less literal labels.
Object.assign(categories.genres['genres-0138'], { tags: ['management','people','competition','strategy'], contrasts: ['cyberspace','mythology'], commonness: 0.55 });
Object.assign(categories.settings['settings-0253'], { tags: ['cyberspace','technology','systems'], contrasts: ['nature','history'], commonness: 0.35 });
Object.assign(categories.core_mechanics['core_mechanics-0093'], { tags: ['people','information','investigation','stealth'], contrasts: ['mythology','nature'], commonness: 0.5 });
// Only an explicitly safe mood conflicts with irreversible failure. Cozy, humorous
// or unusual combinations are not automatically incompatible.
categories.moods['moods-0017'].conflicts = ['permadeath'];
const metadata = { version: 1, tags: rules.map(([tag]) => tag), categories };
await writeFile(new URL('data/smart_metadata.json', root), JSON.stringify(metadata, null, 2) + '\n');
console.log(`Wrote metadata for ${Object.values(categories).reduce((n, values) => n + Object.keys(values).length, 0)} options in five categories.`);
