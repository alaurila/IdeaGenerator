# Design rules

## Page layout

- Keep AI Prompt first, immediately below the top bar.
- Keep AI Prompt compact. Place “Your next game starts here” in the top bar as a small orange tagline. Do not show a separate introductory hint.
- Use one Generate idea button; do not add a separate New Idea button. Generate idea creates a fresh demonstration with two or three locked fields and two or three excluded fields. Roll All respects existing locks and exclusions.
- Keep the generator action buttons in the top bar, with Generate idea immediately next to the language selector.
- Use two header rows: title and orange tagline on the left of the first row, with languages and Generate idea on the right. Right-align all other small buttons on a compact second row. Smaller screens may scroll the secondary row horizontally.
- Match the language selector and Generate idea to a 36px height. Language labels are slightly larger than the compact secondary controls; Generate idea stays visually prominent through its primary color.
- Show all 19 generator fields at once as equally sized cards. Do not hide fields or their controls inside a “More options” section.
- Keep locks, individual rolls, list selection, exclusions and value counts accessible on the cards.
- Initially emphasize genre, main goal and twist. Other cards may blend more into the page background, while remaining readable and usable.
- Provide a button to give every card equal visual emphasis. This is a presentation setting: it must not change values, locks, exclusions, the generated prompt or the idea URL.
- Locked cards must remain visually distinguishable, including when other cards are subdued.
- Place bot instructions at the bottom in small, muted text. Their primary language and examples are English; English is the default language.

## Demonstrative initial state

The original first-visit example deliberately left some fields empty and locked others. This demonstrated the controls immediately instead of showing only fully populated, unlocked fields.

- Preserve this as a design requirement for the introductory example: some fields should be empty/excluded and some populated fields should be locked.
- An empty field remains visible as a card, with an indication that it is excluded and a control to include it again.
- A locked field visibly demonstrates that its value survives subsequent rolls.
- Distinguish empty/excluded fields from subdued cards: subdued cards are still included in generation and the AI prompt; excluded fields are not.
- Explicit seeded URLs must reproduce the requested idea rather than silently applying a different demonstration state.
- On the first visit without a saved idea and on every Generate idea click, populate a new example with two or three locked fields and two or three excluded fields. Keep genre, main goal and twist populated.
- Restore saved user state on later visits. Explicit seeded URLs and `fresh=1` bypass the demonstration and produce a complete, reproducible idea.

The demonstration state is implemented independently of the pure generator used by bots and seeded URLs.

## Game jam mode

- Keep the Game jam toggle in the top bar. Its compact constraint panel appears below AI Prompt.
- Keep all 19 cards visible and equally sized in both modes.
- Provide 300 localized themes with stable IDs per supported language, a theme roll, custom text and a lock.
- A theme directs the overall game and player actions; it does not replace the twist.
- Entering a custom theme or selecting a theme locks it. Unlocking permits subsequent rolls to change it.
- Preserve locked user choices on constraint and language changes. Flag retained choices outside the suggested scope rather than silently changing them.
- Include jam constraints and theme interpretation in the AI prompt and in reproducible URL/JSON output.
- Keep the normal 1–4 value controls usable in every jam configuration. Retain selected counts during mode and constraint changes and generation; scope warnings are advisory, not count limits.

## Sharing

- Keep Copy idea, Copy link and Download image in the top bar, translated into all supported languages.
- Share the current selections without rerolling. Text and image exports include all included fields and active jam context; excluded fields are omitted.
- Add a small credit and generator link to the exported text and PNG card.
- Export a standalone PNG with readable text and dynamic height. Wrap long text instead of truncating it.
- Copy link must restore manually edited ideas as well as seeded ones, including counts, locks, exclusions and custom themes, independently of the recipient's saved state.
- Validate shared snapshots before changing state and give an error for malformed or unavailable options. Keep opened snapshot links synchronized with subsequent edits.
