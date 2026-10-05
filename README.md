# cull-site

The website for CULL: home, formats, changelog, support, privacy policy,
license terms, terms of sale and the press kit. Static HTML, no framework,
served by GitHub Pages from `docs/` on `main`.

```
node build.mjs --sync   # copy CHANGELOG.md, legal/*.md, screenshots, fonts from ../cull, then build
node build.mjs          # build docs/ from content/ + pages/ + assets/
node serve.mjs          # look at docs/ on http://127.0.0.1:8188/
```

- `content/*.md` — text pages rendered by the small Markdown renderer in
  `build.mjs` (headings, paragraphs, lists, bold, links). `changelog.md`,
  `privacy.md` and `terms.md` are copies of the app's files: change them in
  the app repository and run `--sync`. `terms-of-sale.md` lives here.
- `pages/*.html` — page bodies written by hand (home, formats, support, press).
- `assets/` — the stylesheet (the app's tokens), fonts, icon, screenshots.
- `build.mjs` `config` — version shown on the download buttons, the
  downloads address, the support email (empty until one exists).

## The store

`pro.html` (the prices and their buy buttons), `thanks.html` (shows the key
after payment) and `key.html` (has a lost key sent again) are the store.
`assets/store.js` runs all three; each page carries its settings as data
attributes, so nothing is inline. `build.mjs` `config.store` holds what they
need, all of it public: `env` (`off`, `sandbox` or `live`), the license
service address, Paddle client-side token and price ids, and the Turnstile
site key (empty: the lost-key page says to write to support). While `env`
is `sandbox` the three pages carry a test-mode strip. Paddle.js loads on
`pro.html` only, Turnstile on `key.html` only; `thanks.html` runs nothing
but its own script, under a `<meta>` content security policy.

The thank-you page links the installers by the fixed names every release
carries (`CULL-setup.exe`, `CULL.dmg`), so its links hold across versions.
`config.version` is only the number shown on the home page: set it and `--sync` after
a release, which also brings the changelog up to date.

Going live: the license service first (see its README), then `env: "live"`
with the live token and price ids here.

Downloads point at the public `cull-releases` repository. The app's source
is private.
