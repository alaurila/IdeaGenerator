// Versioned, curated scope guidance. IDs remain the same in every language.
export const JAM_POLICY_VERSION = 2;
export const JAM_DEFAULTS = { enabled: false, hours: 48, team: 'solo', experience: 'beginner',
  themeId: null, themeText: '', themeLocked: false };

export function normalizeJam(value = {}) {
  const jam = { ...JAM_DEFAULTS, ...value };
  if (![24, 48, 72, 168].includes(Number(jam.hours)) ||
      !['solo', 'small', 'large'].includes(jam.team) ||
      !['beginner', 'intermediate', 'experienced'].includes(jam.experience)) {
    throw new TypeError('Invalid game jam constraints');
  }
  return { enabled: Boolean(jam.enabled), hours: Number(jam.hours), team: jam.team,
    experience: jam.experience, themeId: typeof jam.themeId === 'string' ? jam.themeId : null,
    themeText: String(jam.themeText ?? '').trim().slice(0, 200), themeLocked: Boolean(jam.themeLocked) };
}

export function jamLevel(jam) {
  const experience = { beginner: 0, intermediate: 1, experienced: 2 }[jam.experience];
  const time = jam.hours === 24 ? 0 : jam.hours <= 72 ? 1 : 2;
  const capacity = jam.team === 'solo' && jam.hours <= 48 ? 0 : 2;
  return Math.min(experience, time, capacity);
}

export function jamOptions(catalog, key, jam) {
  const options = catalog.categories[key];
  if (!jam?.enabled || !catalog.jam?.constrainedCategories.includes(key)) return options;
  const level = jamLevel(jam);
  const pool = options.filter(option => option.jam && option.jam.level <= level);
  if (!pool.length) throw new Error(`No game jam options for ${key}`);
  return pool;
}

// Scope is guidance: expand the pool when needed to honor the user's count.
export function jamSelectionOptions(catalog, key, jam, count) {
  const preferred = jamOptions(catalog, key, jam);
  if (preferred.length >= count) return preferred;
  const ids = new Set(preferred.map(v => v.id));
  const extra = catalog.categories[key].filter(v => !ids.has(v.id)).sort((a, b) =>
    (a.jam?.level ?? Infinity) - (b.jam?.level ?? Infinity) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return [...preferred, ...extra.slice(0, count - preferred.length)];
}

export function resolveJamTheme(jam, themes, random) {
  if (jam.themeLocked) {
    if (jam.themeId) {
      const theme = themes.find(v => v.id === jam.themeId);
      if (!theme) throw new TypeError('Unknown game jam theme ID');
      return { ...theme };
    }
    if (jam.themeText) return { id: null, text: jam.themeText };
  }
  if (!Array.isArray(themes) || !themes.length) throw new TypeError('Missing game jam themes');
  const ordered = [...themes].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { ...ordered[Math.floor(random() * ordered.length)] };
}
