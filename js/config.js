// Kategorioiden määrittely: mistä data tulee, mikä ikoni ja montako arvoa arvotaan.
// Näkyvät nimet tulevat kielitiedostoista (lang/*.json, avain "category.<key>").

export const MIN_COUNT = 1;
export const MAX_COUNT = 4;

export const CATEGORIES = [
  { key: 'genres',              file: 'genres.json',              icon: 'fa-gamepad',          multi: true, defaultCount: 2 },
  { key: 'settings',            file: 'settings.json',            icon: 'fa-map-location-dot' },
  { key: 'player_roles',        file: 'player_roles.json',        icon: 'fa-user-secret' },
  { key: 'main_goals',          file: 'main_goals.json',          icon: 'fa-flag-checkered' },
  { key: 'core_mechanics',      file: 'core_mechanics.json',      icon: 'fa-gears',            multi: true, defaultCount: 2 },
  { key: 'key_resources',       file: 'key_resources.json',       icon: 'fa-coins',            multi: true },
  { key: 'conflicts',           file: 'conflicts.json',           icon: 'fa-burst',            multi: true },
  { key: 'twists',              file: 'twists.json',              icon: 'fa-shuffle',          multi: true },
  { key: 'scales',              file: 'scales.json',              icon: 'fa-maximize' },
  { key: 'eras',                file: 'eras.json',                icon: 'fa-hourglass-half' },
  { key: 'moods',               file: 'moods.json',               icon: 'fa-masks-theater',    multi: true, defaultCount: 2 },
  { key: 'structural_formats',  file: 'structural_formats.json',  icon: 'fa-layer-group' },
  { key: 'player_knowledge',    file: 'player_knowledge.json',    icon: 'fa-eye' },
  { key: 'moral_dilemmas',      file: 'moral_dilemmas.json',      icon: 'fa-scale-balanced' },
  { key: 'failure_types',       file: 'failure_types.json',       icon: 'fa-skull' },
  { key: 'progression',         file: 'progression.json',         icon: 'fa-stairs' },
  { key: 'npc_structures',      file: 'npc_structures.json',      icon: 'fa-people-group',     multi: true, defaultCount: 2 },
  { key: 'generative_elements', file: 'generative_elements.json', icon: 'fa-dice-d20',         multi: true, defaultCount: 2 },
  { key: 'technologies',        file: 'technologies.json',        icon: 'fa-microchip' }
];

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));
