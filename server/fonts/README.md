# Bundled slide fonts

These five families are shipped with ScreenTinker and served from `/fonts`. They are what the
**Slides** editor and **Studio** offer, and what a slide renders in on every player — a browser,
Android, Tizen and BrightSign alike.

| File stem | Family | Role | Weight axis | Scripts | Licence |
| --- | --- | --- | --- | --- | --- |
| `inter` | [Inter](https://github.com/rsms/inter) | Text | 400–800 | latin, latin-ext, cyrillic, cyrillic-ext | [OFL](OFL-inter.txt) |
| `archivo` | [Archivo](https://github.com/Omnibus-Type/Archivo) | Display | 400–800 | latin, latin-ext only | [OFL](OFL-archivo.txt) |
| `oswald` | [Oswald](https://github.com/googlefonts/OswaldFont) | Condensed | 300–700 | latin, latin-ext, cyrillic, cyrillic-ext | [OFL](OFL-oswald.txt) |
| `bitter` | [Bitter](https://github.com/solmatas/BitterPro) | Serif | 400–800 | latin, latin-ext, cyrillic, cyrillic-ext | [OFL](OFL-bitter.txt) |
| `jetbrains-mono` | [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) | Monospace | 400–700 | latin, latin-ext, cyrillic, cyrillic-ext | [OFL](OFL-jetbrains-mono.txt) |

Filenames: `<stem>.woff2` (latin), `<stem>-ext.woff2` (latin-ext), and where available
`<stem>-cyrillic.woff2` / `<stem>-cyrillic-ext.woff2`. Each `@font-face` declares the Google css2
`unicode-range` it was cut against, so a browser downloads only the scripts it needs.

**Archivo has no Cyrillic cut from Google Fonts** — Latin glyphs only. Prefer Inter/Oswald/Bitter
for Russian (and other Cyrillic) copy.

They are **variable** fonts: one file spans the whole weight axis, rather than one file per weight.

## Licensing

Every family here is under the [SIL Open Font License 1.1](https://openfontlicense.org/), which
expressly permits bundling and redistribution — including inside a commercial product, and
including serving the file to a browser. That matters because **every install redistributes these**:
when a slide plays, the server ships the font to the player.

Three obligations come with that, and they are conditions of the licence rather than good manners:

1. **The licence travels with the fonts.** The `OFL-*.txt` files here are shipped in the release
   tarball and in the BrightSign payload (both stage `server/` wholesale) and are served at
   `/fonts/OFL-<family>.txt`.
2. **Reserved Font Names are not used on modified versions.** These files are **official Google
   css2 script subsets** with the same family name Google publishes — not a custom per-character
   subset we cut ourselves. If per-slide subsetting is ever added to cut file size further,
   **the output must be given a different family name.**
3. **The fonts are not sold on their own**, which is not something this product does.

⚠️ `scripts/license-check.js` scans **npm dependencies** and cannot see these files. Adding a family
is a licence decision a human has to make. `server/test/slide-fonts.test.js` asserts that every
declared family has every script file and its `OFL.txt` actually present — it will fail the build
if a family is declared without them.

## Adding a family

1. Confirm it is genuinely OFL — the authoritative check is that it lives under `ofl/` in
   [google/fonts](https://github.com/google/fonts), not `apache/` or `ufl/`.
2. Download the variable `woff2` subsets you intend to ship from the `css2` API (at least latin +
   latin-ext; add cyrillic / cyrillic-ext when Google publishes them), and the `OFL.txt`
   from the repo.
3. Add it to `FAMILIES` in `server/lib/slide-fonts.js` with a `scripts` list. **Take the weight
   range from the API's own `font-weight` declaration** — declaring wider than the file has makes
   the browser clamp silently.
4. Mirror the `@font-face` rules in `frontend-studio/src/fonts.css`.
5. Run the tests. They will tell you if the files or the licence are missing.
