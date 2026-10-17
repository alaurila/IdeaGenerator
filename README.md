# Game Idea Generator

An interactive generator with machine-readable catalogs and fresh bot generation in English,
Finnish, Spanish, Portuguese and French. No dependencies are needed; use Node.js 20 or later.

## Use online

- [English (default)](https://alaurila.github.io/IdeaGenerator/?lang=en)
- [Suomi](https://alaurila.github.io/IdeaGenerator/?lang=fi)
- [Español](https://alaurila.github.io/IdeaGenerator/?lang=es)
- [Português](https://alaurila.github.io/IdeaGenerator/?lang=pt)
- [Français](https://alaurila.github.io/IdeaGenerator/?lang=fr)

## Generate a fresh idea with a bot

Run `npm run --silent generate -- --lang en` to print a fresh JSON idea on every invocation.
English is the default language; omit `--lang` for English, or use `--lang fi` for Finnish.
The CLI generates a random UUID seed unless you explicitly supply `--seed` for replay.
Use `--catalog-url https://alaurila.github.io/IdeaGenerator/data/en/catalog.json` to fetch the
published catalog instead of using the local one.

For browser automation, open `?lang=en&fresh=1` each time, wait for `#idea-output` to contain
an object, then parse its text content as JSON. The address changes to a seeded replay URL.
This overrides stored state and any seed parameter. Reloading the resulting seeded URL replays
the idea; navigate to `fresh=1` again when you need another one.

`data/en/catalog.json` contains all categories and options, not a pre-generated idea.
Replace `en` with `fi`, `es`, `pt` or `fr` for the other languages.
`api.html` documents the bot workflows, response fields and reproducible generation.
Catalogs are static and are committed for branch-based hosting. A plain HTTP request cannot
run generation on GitHub Pages. A bot must execute the module, automate a browser, or sample
from the catalog itself. Server-generated fresh responses would require a separate backend.

## Generate without a browser

```js
import { generateIdea } from './js/ideaEngine.js';

const response = await fetch('https://alaurila.github.io/IdeaGenerator/data/en/catalog.json');
if (!response.ok) throw new Error(`Catalog: HTTP ${response.status}`);
const catalog = await response.json();
const idea = generateIdea({
  catalog,
  language: 'en',
  seed: crypto.randomUUID()
});
```

`generateIdea()` has no DOM, storage or network dependencies and does not mutate its inputs.
It returns `{ schemaVersion, generatorVersion, catalogVersion, language, seed, categories }`.
Each category is an array of `{ id, text }` options. The same language, seed, catalog and algorithm
produce the same result. A changed catalog or algorithm can change existing seeded results.
Schema version 2 replaces the earlier string values with option records. The catalog version
is a SHA-256 hash of the normalized category contents; generator version 1 identifies the current
algorithm. Reordering source options does not change the hash or seeded result.

## Maintain option identifiers

Source files under `data/<language>/` now store `{ id, text }` records in their existing groups.
IDs are permanent and shared by all translations. Edit text without changing its ID, and keep
the same ID when moving an option. For a new concept, assign a new, unused ID in its category
and add that ID to all five languages. Never renumber existing IDs or reuse a removed ID.
The build rejects duplicate IDs or inconsistent ID sets across languages.
Language switching maps options by their ID instead of their source array position.
Saved selections also retain IDs, so correcting labels does not lose them. Existing browser
storage with string-only selections is still accepted and gets IDs on its next update.
Increment `SCHEMA_VERSION` for breaking response changes and `GENERATOR_VERSION` when changing
the deterministic generation algorithm. Existing seeded URLs use the current catalog; preserve
the complete JSON response to archive a particular historical idea.

## URL parameters

Open `?lang=en&seed=my-idea-123` to reproduce an idea. An explicit supported `lang` takes
priority over the saved language; an explicit `seed` takes priority over the saved idea.
Without a seed the app restores a saved idea, or creates a demonstration if none is available.
The first-visit demonstration uses default counts, locks two fields and excludes two
or three others to illustrate the controls. Genre, main goal and twist stay populated.
This example has no replay seed. Explicit seeded URLs and `fresh=1` generate complete ideas
without demonstration locks or exclusions. Generate idea respects existing locks and exclusions.
Changing the language keeps the seed for an unedited generated idea. Manual value changes,
rolls or exclusions remove the seed because it no longer represents the displayed idea.
The language remains in the URL. A manually edited idea still persists locally, but is not
encoded as a shareable URL.

## Publish

The Pages workflow tests, builds and publishes on pushes to `main`. For workflow deployments,
select **Settings → Pages → Source → GitHub Actions** in the repository settings.
For an existing deployment from a branch, the committed generated files work as ordinary
static files; run `npm run build` before committing changes to catalogs or generation.
