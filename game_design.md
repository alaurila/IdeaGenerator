# Game design

## Header and page layout

- Use two compact header rows.
- First row: the application title and a small orange “Your next game starts here” tagline on the left; the language selector and Generate idea immediately beside each other on the right.
- Keep the language selector and Generate idea at the same 36px height. Language buttons are slightly enlarged; Generate idea remains distinguished by its primary color.
- Second row: right-align all remaining actions, including Game jam mode, emphasis, rolling, unlocking, exclusions and sharing. Keep these buttons smaller than the primary controls and on a single row.
- On narrow screens, allow the secondary row to scroll horizontally while keeping every control reachable. Do not let it widen the whole page.
- Use the name “Game jam mode” in English and translate it for other interface languages.
- Keep AI Prompt first below the header. Do not show a separate introductory hint above the cards.
- Show all 19 cards at equal sizes. Emphasize genre, main goal and twist initially; other cards blend more into the background but keep their controls accessible.
- The emphasis toggle affects presentation only. It must not change selected values, counts, locks, exclusions or the prompt.
- English is the default language. Keep bot instructions in English at the bottom, with small, muted text.
- Keep the app on one page. At the bottom, provide initially collapsed About the generator, Game jam mode and Instructions for bots sections, with complete English text already in the HTML.
- Everyone can open these sections without JavaScript. Metadata and WebApplication JSON-LD describe the same visible capabilities; do not create bot-only keyword text or invented reviews.

## Example generation

- Generate idea creates a fresh demonstration, also used on the first visit without saved state.
- Randomly lock 2–3 populated fields and leave 2–3 other fields empty/excluded. These groups must not overlap.
- Keep genre, main goal and twist populated so the idea has an immediately readable starting point.
- All 19 equal-size cards stay visible. Excluded fields show an empty indicator and a control to restore their content.
- Roll All changes only unlocked, included fields. Generate idea creates a new example with a new random selection of locks and exclusions.
- Locks and exclusions persist with the saved idea. Changing visual emphasis must not change them.
- Seeded URLs and `fresh=1` produce complete, reproducible results for bots and explicit replays, without example locks or exclusions.

## Game jam mode

- Jam constraints cover 24/48/72 hours or one week, solo/small/large teams and beginner/intermediate/experienced creators.
- Provide 300 translated themes per supported language with permanent IDs, alongside editable custom themes.
- Themes can be rolled and locked. The theme guides the overall game; the twist is a separate surprising detail.
- Apply curated scope profiles to generation and include the jam constraints and theme interpretation in the AI prompt.
- Keep every card visible and warn when a retained user selection conflicts with the selected jam scope.
- Jam constraints never lower or disable the normal 1–4 value counts. Preserve chosen counts when toggling jam mode, changing constraints, rerolling or pressing Generate idea. Expand the suggested pool if necessary to supply enough distinct values.

## Sharing

- Copy the idea as readable text or download a PNG card, both with included fields, jam context and a small link to the generator.
- A separate Copy link action shares the actual selected values and control state, including edited ideas with no replay seed.
- Sharing must not change the idea, its locks, exclusions or selected counts.
