// URL parsing is independent of browser globals so consumers can reuse it.
export function readIdeaUrl(url, supportedLanguages, fallbackLanguage) {
  const language = url.searchParams.get('lang');
  return {
    language: supportedLanguages.includes(language) ? language : fallbackLanguage,
    seed: url.searchParams.get('seed'),
    fresh: url.searchParams.get('fresh') === '1'
  };
}

export function updateIdeaUrl(url, language, seed = null) {
  const result = new URL(url);
  result.searchParams.delete('fresh');
  result.searchParams.set('lang', language);
  if (seed === null) result.searchParams.delete('seed');
  else result.searchParams.set('seed', seed);
  return result;
}
