# PUFF coded — 350 ml tumbler

A single-product storefront page for the 350 ml Mykonos blue tumbler. Plain
HTML, CSS and vanilla JS with no build step: `index.html` is the whole site.

```bash
python3 -m http.server 8412
# then open http://127.0.0.1:8412/
```

A server is needed rather than opening the file directly, because the browser
will not `fetch` the GLB over `file://`.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page. Assumptions and open TODOs are listed in a comment at the top. |
| `style.css` | Components. Every value resolves to a token — no literal colours or sizes. |
| `script.js` | Theme toggle, the two 3D stages, hotspots, count-ups, FAQ, pack selection, sticky bar. |
| `assets/design-system/tokens.css` | The Mykonos Blue design system: colour, type, space, radius, elevation. |
| `assets/model/tumbler.glb` | The tumbler model — five named parts, one PBR atlas, one `Explode_and_Return` clip. |
| `assets/model/validation.json` | Dimensions and per-part geometry checks the page's spec table quotes. |
| `assets/img/*.svg` | Placeholder imagery, stamped as such. |

## Design system

`assets/design-system/tokens.css` implements the Mykonos Blue system
token-for-token: the Cycladic palette (Mykonos blue, Aegean night, whitewash,
stone, brushed steel, one sunlit brass accent), the Instrument Serif /
General Sans pairing, an 8pt space scale, hierarchical radii and ink-tinted
shadows.

- **Light is the default.** Dark is applied twice, for the `[data-theme]`
  toggle and for `prefers-color-scheme`, because plain CSS has no mixins and
  this project has no build step.
- **The serif is an accent**, not a workhorse: hero, closing line, the feature
  and stat figures, pull quotes, price, wordmark. Nowhere else.
- **Brass is the single accent** — calls to action, price, selected states.
- Sentence case throughout. No uppercase labels, no arrow glyphs appended to
  links, no uniform border radius.

The header toggle pins a mode to `localStorage`; a small inline script in
`<head>` applies it before first paint so the chosen mode never flashes.

## The 3D stages

Two [`<model-viewer>`](https://modelviewer.dev) instances share one cached GLB:
4:5 in the hero, 1:1 in the demo section, both at a fixed aspect ratio so the
model never changes size across breakpoints. Environment map, exposure and
shadow settings are identical in both light and dark mode — a colder
environment in dark mode would shift the matte finish's hue between them.

Motion is one orchestrated moment plus state-change feedback: the hero model
settles into the stage on load, then turns at 8 seconds per revolution and
pauses while you drag it. Entering the demo section tilts the second stage onto
the straw opening and stills the hero; scrolling back restores both. Hotspots
on either stage fill one callout and highlight the matching row in the parts
list. `prefers-reduced-motion` is respected.

## Accessibility

Every foreground/background pair was measured. Body text is 13.2:1 in light and
14.4:1 in dark; the blue CTA is 5.93:1, the brass CTA on Aegean night 4.69:1,
focus rings 5.93:1 and 5.36:1. Two adjustments came out of that: full brass on
whitewash is 2.79:1, so the star row uses the darkened accent, and the ochre
warning tone was 2.73:1, so the scarcity note's icon is muted ink — the
`warning` token stays for actual warnings.

## Before launch

Listed as TODO at the top of `index.html`:

- `--color-mykonos-blue` (`#44607A`) is a working approximation of Pantone
  18-4434. Sample the final product render and update that one token; every
  blue on the page follows it.
- The GLB still carries its original navy base-colour texture, so the model
  does not yet read as Mykonos blue. Either re-bake the base colour from the
  final render — which keeps the printed lettering and dot pattern — or drop
  the base-colour texture and set the brand blue as a flat factor, which gets
  the tone right but loses that artwork.
- Replace the placeholder imagery.
- Price, the free-shipping threshold and the review figures are placeholder
  copy, and the cart is front-end only.

Dimensions, capacity and materials copy come from `assets/model/validation.json`
and are stated on the page as estimates: 350 ml is measured below the lid roof,
excluding drinking headspace. Not a certified measurement.
