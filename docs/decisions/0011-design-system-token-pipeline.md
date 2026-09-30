# ADR 0011 — Design system and the Figma → code token pipeline

**Status:** Accepted · **Date:** 2026-09-14 · **Deciders:** Yash

## Context

The femmeflats design system is a **customised Untitled UI**:

- Design side: the Untitled UI Figma kit.
- Code: Untitled UI React (React Aria based), with `@untitledui/icons`.

The current Figma export is still **stock Untitled UI**: the default blue brand
ramp of Untitled UI, and Inter fonts. The customisation comes subsequently,
through this same pipeline.

`figma-mcp-bridge` makes snapshots of the Figma file. Its own documentation
says that values go **Figma → export only**. If you edit an exported file, this
changes nothing in Figma, and the next export overwrites the file. The export
is a build artefact, not a sync.

The current export has **691 variables in 7 collections**, 44 text styles, 26
effect styles, 8 grid styles, 111 gradient styles and 299 solid colour styles.
Untitled UI already designed the token system. The variables already have tiers,
light/dark modes and Tailwind v4 namespaces. Only the rebrand remains.

| Tier | Collections | Example |
|---|---|---|
| Primitives | colour, spacing | `Colors/Brand/600` → `#2563eb` |
| Semantic (moded) | text, fg, bg, border, effects, alpha | `bg-brand-solid` |
| Component | component, utility colour | `utility-brand-900_alt` |

## Decisions

**In one line:** Figma is the single source of truth, and a generator makes `theme.css` from `figma-variables.json`, with aliases as `var()` references, never flattened.

### 1. Figma is the single source of truth

- You define and edit tokens only in Figma.
- The export, `token-map.md`, `theme.css` and all generated files are derived
  artefacts. Nobody ever edits a generated file by hand, because the next sync
  overwrites it.
- If code needs a token that Figma does not have, the path is `DS-GAP` →
  designer adds it in Figma → re-export. There is no code → Figma direction.

### 2. Build input is `figma-variables.json`, not `tokens.dtcg.json`

The bridge writes the two files. DTCG, the industry-standard format, **loses data in exactly the way that is
important to us**:

- `$value` carries only the *default* mode of the collection. The other modes
  are deep in `$extensions["com.figma"].modes`.
- Here, light and dark are each first-class. Thus, a standard DTCG build would
  silently drop one of them.
- We would read the Figma extension block by hand in all conditions. This
  removes the only real advantage of DTCG.

The lossless file also keeps the `valuesByMode` **aliases by id**. Decision 4
depends on this. `tokens.dtcg.json` stays useful as an interchange artefact for
any future tool that wants standard DTCG.

### 3. `theme.css` is generated wholesale

If you delete `theme.css`, it regenerates from the export. No hand edit can
cause drift. Thus, the structure gives Figma ↔ code parity, and the parity does
not depend on discipline.

**Required mitigation.** When the generator makes the full file, a naming
divergence would silently break Untitled UI React components, and not show an
error. Thus, the generator ends with a verification pass:

1. It collects all `var(--…)` references in the component source of Untitled
   UI React.
2. If the generated file does not define any one of them, the build must
   **hard-fail**.

Thus, a silent visual break becomes a loud build error.

### 4. Aliases are preserved as `var()` references, never flattened

```css
@theme {
  --color-neutral-900: #171717;                      /* primitive: literal */
  --color-text-primary: var(--color-neutral-900);    /* semantic: reference  */
}
@layer base {
  .dark-mode {
    --color-text-primary: var(--color-neutral-50);   /* reassigns the SEMANTIC token */
  }
}
```

- You can see the primitive → semantic tier in the CSS.
- If you recolour one primitive, the change cascades to all locations.
- DevTools shows the full chain.
- If we flatten the aliases, only Figma and `token-map.md` would record that
  structure.

Generator rules:

| Case | Emit |
|---|---|
| The value is a raw value (primitives) | literal |
| The value is a `VARIABLE_ALIAS` | `var(--<resolved target name>)` |
| The alias target is not in the export (`unresolvedAliases`) | **fail the build** |
| The alias goes across collections | resolve in the `defaultModeId` of the target collection, as the bridge docs specify |
| Two collections have the same variable name | resolve **by id**. The bridge docs state this limitation |

### 5. Plain `@theme`, not `@theme inline`

This trap makes decision 4 safe or broken.

- With plain `@theme`, the utility compiles to `color: var(--color-text-primary)`.
  Thus, when `.dark-mode` reassigns that token, the utility uses the new value.
- With `@theme inline`, the value goes into the utility as
  `color: var(--color-neutral-900)`. Then the `.dark-mode` reassignment has **no
  effect**.

**The rule that follows: dark mode reassigns the *semantic* token, never the
primitive.** Figma already models it in this way. Semantic variables carry
aliases for each mode, and primitives do not change with the mode.

### 6. femmeflats is light-first, matching Untitled UI

- Light values are in `@theme`. Dark values are in
  `@layer base { .dark-mode { … } }`. We do not invert the architecture of the
  library.
- Dark mode is a **class**, not a media query. Thus, for an Appearance setting
  of "system", we read `prefers-color-scheme` in JavaScript. Then we apply
  `.dark-mode` on the root element ourselves.

### 7. Generated files are committed; CI verifies they are current

We commit `theme.css` and all other generated artefacts. Each one has a
`generated — do not edit` header. CI runs the generator again, and it **fails
if the output is different from the committed files**.

- Vercel and Fly builds need no Figma access and no generator step.
- A Figma change shows as a CSS diff in the pull request that you can review.
- If a person edits a generated file by hand, CI finds it at that time, not
  subsequently. Decision 3 exists to prevent this drift.

Cost: regenerated files show in diffs. We accept this, because that visibility
is the purpose.

## Consequences

- The generator must also emit primitives into `@theme`. If it does not, the
  `var()` references dangle. Primitive utilities that you do not use cost
  nothing, because Tailwind emits only what you use.
- `check-tokens.mjs` continues to make sure that components use semantic
  tokens, because the primitives in `@theme` make `bg-neutral-900` technically
  valid.
- We commit each generated file with a clear mark that it is generated (decision 7).
  The review is on the Figma change and the generator, not on the output.
- The rebrand (brand ramp → femmeflats, typography) changes only values, and it
  runs this pipeline again. It needs no architectural work.

## Blocked

**We cannot write the naming transform at this time.**

- `token-map.md` proposes `--color-bg-primary` → utility `bg-primary`. But stock
  Tailwind v4 would generate `bg-bg-primary` from that variable.
- Untitled UI React must define custom utilities to get the shorter names. Its
  own docs do not say how.
- One command removes this block: `npx untitledui@latest tailwind`. Then read
  the real `theme.css`. Its names win, as `token-map.md` specifies.

Until then, the name-mapping rules of the generator are not specified. We
settled all the other items in this ADR.

## Notes

- We deprecated `PRD.md` (2026-09-14). It is not a source for design decisions.
- When Brand moves to a rose/red hue, **brand and `error` must stay clearly
  different**. femmeflats is a safety product. On it, Block, Report and
  destructive confirmations cannot read as primary actions.
