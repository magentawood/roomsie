# Styling standards

These rules apply to Tailwind CSS v4, theme tokens and the Untitled UI pipeline. The rules in [_index.md](_index.md) also apply.

The launch uses the look of the V3 prototype, as an exception to ADR-0011. Untitled UI comes after the launch ([PD12](../decisions/pd-12-team-plan.md)). Thus, this file has two parts:

- **Launch rules** apply to all styles from today.
- **Token pipeline rules** start when the Untitled UI pipeline ships. Reviewers enforce them only after that.

PD12 gives this division: at launch, the styles of the V3 prototype apply, and the ADR-0011 token pipeline starts after the launch ([PD12](../decisions/pd-12-team-plan.md)). The launch rules are the ADR-0011 rules that do not need the Figma pipeline.

## Launch rules

- Colours, type and spacing in components come from theme tokens, never from hex or arbitrary values [tool]. Why: the v1 pipeline then changes token definitions, not component code. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md), [ADR-0013](../decisions/0013-ci-gate-and-testing.md), [PD12](../decisions/pd-12-team-plan.md))
- Components use semantic tokens, never primitives [tool]. Why: dark mode reassigns only the semantic tokens. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md), [ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- Use plain `@theme`, never `@theme inline`. Why: with `inline`, the dark mode values have no effect. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- Put the light values in `@theme`. Put the dark values in `@layer base { .dark-mode { … } }`. Why: the product is light-first, as Untitled UI is. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- Dark mode reassigns semantic tokens only, never primitives. Why: primitives do not change with the mode. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- Dark mode is the `.dark-mode` class on the root element, not a media query. Why: the class lets the user select the mode. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- For the "system" appearance, read `prefers-color-scheme` in JavaScript, then apply `.dark-mode`. Why: the class, not the media query, controls the mode. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- Block, Report and destructive confirmations never look like primary brand actions. Why: on a safety product, a user must not confuse them. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- The brand colour stays clearly different from the `error` colour. Why: the same safety reason. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))

## Token pipeline rules

- Define and change tokens only in Figma. Why: Figma is the single source of truth, and no path goes from code to Figma. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- If code needs a token that Figma does not have, raise a `DS-GAP` for the designer. Why: the designer adds it in Figma, and the next export brings it. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- Never edit `theme.css` or a different generated file by hand. Each generated file has a `generated — do not edit` header. Why: the next export overwrites the edit. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- The generator reads `figma-variables.json`, not `tokens.dtcg.json`. Why: DTCG keeps only the default mode, so it drops dark mode. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- The generator writes each alias as a `var()` reference, never as a flat value. Why: a change to one primitive then goes to all tokens that use it. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- The generator fails the build on an alias that it cannot resolve [tool]. Why: a missing target must be a loud error. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- The generator fails the build if Untitled UI React uses a `var(--…)` that the output does not define [tool]. Why: a name difference must not break a component silently. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
- Commit the generated files. CI runs the generator again and fails if the output is different [tool]. Why: CI finds a hand edit immediately. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md), [ADR-0013](../decisions/0013-ci-gate-and-testing.md))
- OPEN: utility names come from the Untitled UI `theme.css` that `npx untitledui@latest tailwind` writes. Why: we cannot write the name transform until someone runs that command. ([ADR-0011](../decisions/0011-design-system-token-pipeline.md))
