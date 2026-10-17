# Game design

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
