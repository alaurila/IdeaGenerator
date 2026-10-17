# Smart generation, first version

Implementation follows `todo.md`, with one commit per numbered phase.

- [x] 1. Metadata for genre, setting, core mechanic, mood and twist.
- [x] 2. Pure scoring engine and weighted synergy.
- [x] 3. Contrast-based tension.
- [x] 4. Commonness-based novelty.
- [x] 5. Conservative conflict penalties.
- [x] 6. Configurable total score.
- [x] 7. Smart Roll preserving user constraints.
- [x] 8. Compact score display.
- [x] 9. Short rule-based explanations.

## Metadata

`data/smart_metadata.json` is the shared, language-independent registry keyed by existing
option IDs. It covers only the five requested categories. The build merges `tags`,
`contrasts` and `commonness` into their catalog options; existing source lists remain valid.
`generateIdea()` retains this metadata on the selected options, making standalone scoring possible.

`scripts/generate-smart-metadata.js` bootstraps the registry from English labels using a small
explicit vocabulary and reviewed anchors. It is an authoring aid, not runtime classification.
Commonness values are initial design estimates, not measured usage frequencies. Review and tune
the committed registry before expanding it. Re-running the bootstrap replaces that registry.
All languages share IDs and scoring metadata; translations never determine scores.

## Scoring

`scoreIdea(idea)` is a pure module with no DOM, storage or network dependencies. It accepts
generated ideas containing selected option metadata. `buildScoringIdea(state, catalog)` adapts
the UI's string selections and excludes omitted cards. Legacy options without metadata are ignored.
`scoringConfig.js` centralizes six weighted category relationships and a small set of supporting
tag pairs. Shared tags use normalized overlap; category pairs average multiple selections.
Tension uses weighted, bidirectional contrast-to-tag matches. Contrasts are positive creative
friction, never conflict rules.
Novelty is `100 * (1 - averageCommonness)` across recognized selected options. Missing or invalid
commonness is ignored rather than rewarded. No common-pair frequency rules are introduced.
Conflict rules are deliberately sparse: the explicitly Safe mood conflicts with permadeath.
Cozy alone does not imply this constraint. Repeating a target tag does not multiply the same
source rule. The initial penalty is 12 per matching rule, capped at 30, and remains distinct
from positive contrast-based tension.
Total is clamped to 0–100 using `0.35*synergy + 0.30*tension + 0.35*novelty - 0.50*conflict`.
All initial pair, support, conflict and total weights are in `js/scoringConfig.js`.

## Smart Roll

The separate toolbar action searches 500 unique candidate attempts in batches of 25, keeping
the interface responsive. It randomly picks one of the top ten distinct scored combinations
whose total is at least the current idea's total. If none qualify, the current idea is kept.
Locks, exclusions, counts (including four values), game jam pools and the current theme are
preserved. Unscored fields roll normally with each candidate; only the five core categories
affect ranking. Editing the idea or changing language cancels a pending search. No LLM or
external service is involved. Ordinary generation retains its existing behavior.

## Score display

A native, initially collapsed details section after AI Prompt shows synergy, tension, novelty and interestingness on a 0–100
scale, with a conflict penalty when applicable. Numbers and small progress bars update after
every edit, regular roll, smart search, language change or shared-link restoration. Excluded
fields do not contribute; the panel hides when no scored selections remain. Scores are derived
from current selections, not persisted as a separate source of truth. All five UI languages
describe the metrics as rule-based estimates rather than a guarantee of game quality.
Opening or closing the section changes only presentation. Scores keep updating while collapsed,
and the open state survives rolls and language changes until the next page load. Easy mode hides
the entire section while preserving its open state.

## Explanations and first-version boundary

`explainIdea()` returns up to three template keys with evidence, without DOM, storage, language
or network dependencies. Explicit conflicts take priority, followed by the strongest weighted
synergy and contrast matches and a commonness explanation when room remains. Empty or legacy
ideas do not produce invented explanations. The UI translates the templates and trait labels,
while the underlying metadata keys remain English. Option names are rendered as text.

The first version ends here: metadata covers only five categories, commonness is an authoring
estimate, conflicts are sparse and no pair-frequency history or external AI is used. Test actual
results and tune the shared config/registry before considering more categories.

## Smart generation for bots

`npm run --silent generate -- --smart` generates a fresh complete idea, then uses the existing
500-attempt search and top-ten selection. It adds `scores`, `explanations` with template keys,
parameters and localized text, and a `smart` object with version, candidate/top counts, evaluated
attempts, changed flag and reason. `reason` is `selected` or `noImprovement`; the latter keeps
the initial idea if no distinct qualifying candidate is found. Ordinary CLI output is unchanged.

`js/smartGeneration.js` exports the browser-independent `generateSmartIdea(options)` wrapper.
It accepts the ordinary generator's catalog, language, seed, jam and counts options and returns
the same idea shape with scores, raw explanation templates and search metadata. It does not
fetch data or translations. The CLI adds translated explanation text using the same formatter
as the UI. Metadata is still limited to the same five categories.

Unlike the interactive Smart Roll, bot smart generation uses a deterministic RNG derived from
the requested seed and `SMART_GENERATION_VERSION`. Sorting the candidate pools by ID keeps
reordered catalogs equivalent. Replay requires `--smart`, the seed and the same catalog,
language, jam options and smart algorithm/scoring version. An ordinary browser seed link does
not run smart search. Increment `SMART_GENERATION_VERSION` when changing smart search or scoring
rules/weights, and keep the full response for long-term archives.

`--smart` works with `--lang`, jam/theme options and `--catalog-url`. Catalogs without complete
scoring metadata fail clearly; ordinary generation continues to accept legacy catalogs.

Validation: `npm test` rebuilds catalogs and checks generation, stable IDs, all languages, jam
scope/counts, share snapshots, scoring, explanations and smart search constraints/cancellation.
Browser checks also cover ordinary and smart rolling, score updates, language changes, compact
desktop/mobile layout, omitted fields and preserving the AI Prompt's first position.
