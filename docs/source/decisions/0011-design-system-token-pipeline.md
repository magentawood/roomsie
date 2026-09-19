# ADR 0011 — Design system and the Figma → code token pipeline

**Status:** Accepted · **Date:** 2026-09-14 · **Deciders:** Yash

## Context

The femmeflats design system is a **customised Untitled UI**: the Untitled UI
Figma kit on the design side, Untitled UI React (React Aria based) in code, with
`@untitledui/icons`. The current Figma export is still **stock Untitled UI** —
the brand ramp is Untitled UI's default blue, fonts are Inter. Customisation
happens later and flows through this same pipeline.

`figma-mcp-bridge` snapshots the Figma file. Per its own documentation, values
flow **Figma → export only**; editing an exported file changes nothing in Figma
and the next export overwrites it. The export is a build artefact, not a sync.

Current export: **691 variables across 7 collections**, plus 44 text styles, 26
effect styles, 8 grid styles, 111 gradient styles, 299 solid colour styles.

## Decisions

### 1. Figma is the single source of truth

Tokens are defined and edited only in Figma. The export, `token-map.md`,
`theme.css` and every generated file are derived artefacts. Nothing generated is
ever hand-edited — the next sync overwrites it.

The path for a token code needs but Figma lacks is `DS-GAP` → designer adds it
in Figma → re-export. There is no code → Figma direction.

### 2. Build input is `figma-variables.json`, not `tokens.dtcg.json`

The bridge writes both. DTCG is **lossy in exactly the way that matters to us**:
`$value` carries only the collection's *default* mode, with the others buried in
`$extensions["com.figma"].modes`.

Light and dark are both first-class here, so a standard DTCG build would
silently drop one of them, and we would be reading the Figma extension block by
hand regardless — which removes DTCG's only real advantage.

The lossless file also keeps `valuesByMode` **aliases by id**, which decision 4
depends on.

`tokens.dtcg.json` remains useful as an interchange artefact for any future tool
that wants standard DTCG. It is not the build input.

### 3. `theme.css` is generated wholesale

`theme.css` is a pure build artefact: delete it and it regenerates from the
export. Nothing drifts by hand-editing, and Figma ↔ code parity is structural
rather than a matter of discipline.

**Required mitigation.** Generating wholesale means a naming divergence would
silently break Untitled UI React components rather than error. So the generator
ends with a verification pass: collect every `var(--…)` referenced by Untitled
UI React's component source, and **hard-fail the build** if the generated file
does not define one. A silent visual break becomes a loud build error.

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

The primitive → semantic tier stays visible in the CSS itself, recolouring one
primitive cascades everywhere, and DevTools shows the whole chain. Flattening
would leave that structure documented only in Figma and `token-map.md`.

Generator rules:

| Case | Emit |
|---|---|
| Value is a raw value (primitives) | literal |
| Value is a `VARIABLE_ALIAS` | `var(--<resolved target name>)` |
| Alias target missing from the export (`unresolvedAliases`) | **fail the build** — never silently flatten |
| Alias crosses collections | resolve in the target collection's `defaultModeId`, per the bridge docs |
| Two collections share a variable name | resolve **by id**, never by name — a stated bridge limitation |

### 5. Plain `@theme`, not `@theme inline`

This is the trap that makes decision 4 safe or broken, so it is recorded
explicitly.

With plain `@theme`, the utility compiles to `color: var(--color-text-primary)`,
so `.dark-mode` reassigning that token is picked up. With `@theme inline` the
value is baked into the utility as `color: var(--color-neutral-900)` and the
`.dark-mode` reassignment has **no effect**.

**The rule that follows: dark mode reassigns the *semantic* token, never the
primitive.** This matches how Figma already models it — semantic variables carry
per-mode aliases, primitives are mode-independent.

### 6. femmeflats is light-first, matching Untitled UI

Light values live in `@theme`; dark values in `@layer base { .dark-mode { … } }`.
We do not invert the library's architecture.

Because dark mode is a **class** rather than a media query, an Appearance
setting of "system" means reading `prefers-color-scheme` in JavaScript and
applying `.dark-mode` on the root element ourselves.

### 7. Generated files are committed; CI verifies they are current

`theme.css` and every other generated artefact are committed, each carrying a
`generated — do not edit` header. CI re-runs the generator and **fails if the
output differs from what is committed**.

- Vercel and Fly builds need no Figma access and no generator step.
- A Figma change shows up as a reviewable CSS diff in the pull request, so
  design review really does become code review.
- Hand-editing a generated file is caught by CI rather than discovered later,
  which is the drift that decision 3 exists to prevent.

Cost: regenerated files appear in diffs. Acceptable — that visibility is the
point.

## Consequences

- Primitives must also be emitted into `@theme`, or `var()` references dangle.
  Unused primitive utilities cost nothing — Tailwind emits only what is used.
- `check-tokens.mjs` keeps enforcing that components use semantic tokens, since
  primitives being present in `@theme` makes `bg-neutral-900` technically valid.
- Every generated file is gitignored or clearly marked generated; review happens
  on the Figma change and the generator, not the output.
- The rebrand (brand ramp → femmeflats, typography) is a values-only change that
  re-runs this pipeline. No architectural work.

## Blocked

**The naming transform cannot be written yet.** `token-map.md` proposes
`--color-bg-primary` → utility `bg-primary`, but stock Tailwind v4 would
generate `bg-bg-primary` from that variable. Untitled UI React must define
custom utilities to get the shorter names, and its own docs do not say how.

Unblocked by one command: `npx untitledui@latest tailwind`, then read the real
`theme.css`. Its names win, per `token-map.md`. Until then the generator's
name-mapping rules are unspecified; everything else above is settled.

## Notes

- `PRD.md` is deprecated (2026-09-14) and is not a source for design decisions.
- The current export is stock Untitled UI. Known customisation work outstanding:
  the Brand ramp is still Untitled UI blue, and font family variables are still
  Inter. When Brand moves to a rose/red hue, **brand and `error` must stay
  clearly distinguishable** — Block, Report and destructive confirmations cannot
  read as primary actions on a safety product.
