# Design rules

## Page layout

- Keep AI Prompt first, immediately below the top bar.
- Keep AI Prompt compact. Place “Your next game starts here” in the top bar as a small orange tagline. Do not show a separate introductory hint.
- Use one Generate idea button; do not add a separate New Idea button. Generation respects existing locks and exclusions.
- Keep the generator action buttons in the top bar, with Generate idea immediately next to the language selector.
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
- On the first visit without a saved idea, populate a new example with two locked fields and two or three excluded fields. Keep genre, main goal and twist populated.
- Restore saved user state on later visits. Explicit seeded URLs and `fresh=1` bypass the demonstration and produce a complete, reproducible idea.

The demonstration state is implemented independently of the pure generator used by bots and seeded URLs.
