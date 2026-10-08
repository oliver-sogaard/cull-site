#!/usr/bin/env node
/**
 * cull-site build: content in `content/` (Markdown) and `pages/` (HTML
 * bodies) → `docs/` (what GitHub Pages serves, from the main branch). No dependencies: the
 * Markdown the legal texts and the changelog use is headings, paragraphs,
 * lists, bold and links, and that is what `md()` renders.
 *
 * `node build.mjs`         build
 * `node build.mjs --sync`  first copy CHANGELOG.md and legal/*.md from the
 *                          app checkout beside this folder, then build
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "docs");
const app = path.join(here, "..", "cull");

export const config = {
  name: "CULL",
  tagline: "Keyboard-fast culling for RAW photos",
  downloads: "https://github.com/oliver-sogaard/cull-releases/releases/latest",
  version: "2.10.2",
  /** Empty until the owner sets them (same values as src/product.ts). */
  supportEmail: "support@cull.photography",
  reportUrl: "",
  owner: "Oliver Søgaard-Andersen",
  year: "2026",
  /**
   * The store. `env`: "off" (prices shown, nothing to buy), "sandbox"
   * (Paddle's test checkout, a strip says so) or "live". Everything here is
   * public by design: the client-side token and the price ids are sent to
   * every visitor's browser, and so is the Turnstile site key. The secrets
   * live in the license service (the cull-api Worker), never here.
   */
  store: {
    env: "sandbox",
    apiUrl: "https://api.cull.photography",
    clientToken: "test_5333af6d0cf1e18adcc770b273b",
    prices: {
      monthly: "pri_01m44bw9kvenpc3gpqxspy91w4",
      yearly: "pri_01m44bxtqtq5rkce9hncd0q35x",
      lifetime: "pri_01m44bz2q9s6xw3rc5x17eyk43",
    },
    /** Cloudflare Turnstile (widget cull-lost-key). Empty: the lost-key page says "write to support". */
    turnstileSiteKey: "0x4AAAAAAFNzi3zLR0LghzKn",
  },
};

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Inline Markdown: bold, code, links. Text is escaped first. */
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) =>
      /^(https?:|mailto:|\.\/|\/|#)/.test(u) ? `<a href="${u}">${t}</a>` : t,
    )
    .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:])/g, "$1<em>$2</em>");
}

/** Block Markdown: #/##/### headings, -, paragraphs, blank-line separated. */
export function md(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let para = [];
  let list = null;
  const flushPara = () => {
    if (para.length) html.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const level = h[1].length;
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      html.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
      continue;
    }
    const li = /^- (.*)$/.exec(line);
    if (li) {
      flushPara();
      list = list ?? [];
      list.push(li[1]);
      continue;
    }
    if (line === "") {
      flushPara();
      flushList();
      continue;
    }
    if (list && /^\s+/.test(raw)) {
      list[list.length - 1] += " " + line.trim();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return html.join("\n");
}

const nav = (active) =>
  [
    ["formats", "Formats"],
    ["changelog", "Changelog"],
    ["support", "Support"],
    ["pro", "Pro", "is-cta"],
  ]
    .map(([slug, label, cls]) =>
      `<a href="./${slug}.html"${cls ? ` class="${cls}"` : ""}${active === slug ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("\n          ");

const selling = () => config.store.env === "sandbox" || config.store.env === "live";

/** A short content hash, so a changed script is fetched at once: GitHub
 *  Pages lets browsers keep a file for ten minutes. */
const assetHash = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(path.join(here, "assets", file))).digest("hex").slice(0, 10);

/**
 * `head`: extra tags for this page's head. `scripts`: script tags placed
 * at the end of the body, in order. `store`: one of the store's pages, which
 * carry the test-mode strip while the checkout is Paddle's sandbox.
 */
export function layout({ slug, title, description, body, wide = false, head = "", scripts = [], store = false }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <!-- Not released: removed on launch day. -->
    <meta name="robots" content="noindex" />
    <link rel="icon" href="./assets/icon-64.png" />
    <link rel="stylesheet" href="./assets/site.css" />
    <link rel="stylesheet" href="./assets/pages.css" />${head ? `\n    ${head}` : ""}
  </head>
  <body>${store && config.store.env === "sandbox" ? `\n    <div class="teststrip" role="note">Test mode · no real payment is taken on this page</div>` : ""}
    <header class="nav">
      <div class="wrap nav__row">
        <a class="nav__brand" href="./">CULL</a>
        <nav class="nav__links" aria-label="Site">
          ${nav(slug)}
        </nav>
      </div>
    </header>
    <main${wide ? "" : ' class="wrap page"'}>
${body}
    </main>
    <footer class="footer">
      <div class="wrap footer__row">
        <div>
          <a href="./formats.html">Formats</a><a href="./pro.html">Pro</a><a href="./changelog.html">Changelog</a><a href="./support.html">Support</a><a href="./privacy.html">Privacy policy</a><a href="./terms.html">License terms</a><a href="./terms-of-sale.html">Terms of sale</a><a href="./terms-of-sale.html#refunds">Refunds</a><a href="./press.html">Press kit</a>
        </div>
        <div>© ${config.year} ${esc(config.owner)}</div>
      </div>
    </footer>${scripts.map((s) => `\n    ${s}`).join("")}
  </body>
</html>
`;
}

/** The attributes a store page's script reads its settings from. */
function storeAttrs(page) {
  const s = config.store;
  const attrs = { store: page, env: s.env, api: s.apiUrl };
  if (page === "pro") Object.assign(attrs, { token: s.clientToken, ...s.prices });
  return Object.entries(attrs)
    .map(([k, v]) => `data-${k}="${esc(v)}"`)
    .join(" ");
}

const storeScript = () => `<script src="./assets/store.js?v=${assetHash("store.js")}" defer></script>`;

/** A buy button, or nothing while the store is off. */
const buyButton = (plan, label, primary) =>
  selling()
    ? `<button class="btn${primary ? " btn--primary" : " btn--sm"}" type="button" data-buy="${plan}">${label}</button>`
    : "";

function proPage(read) {
  const supportBlock = config.supportEmail
    ? `<p>Support: <a href="mailto:${config.supportEmail}">${config.supportEmail}</a>.</p>`
    : "";
  const body = read("pages/pro.html")
    .replaceAll("{{storeAttrs}}", storeAttrs("pro"))
    .replaceAll("{{buyLifetime}}", buyButton("lifetime", "Buy Lifetime", true))
    .replaceAll("{{buyYearly}}", buyButton("yearly", "Buy Yearly", false))
    .replaceAll("{{buyMonthly}}", buyButton("monthly", "Buy Monthly", false))
    .replaceAll(
      "{{storeNote}}",
      selling()
        ? ""
        : `<p class="buy__fine">Sales open soon. Until then there is nothing to buy here, and CULL Free is the whole app up to 250 frames a session, with no time limit.</p>`,
    )
    .replaceAll("{{supportEmailBlock}}", supportBlock);
  return layout({
    slug: "pro",
    title: "CULL Pro — prices and how a license works",
    description: "What CULL Pro costs (monthly, yearly or once for life), and how a license key works on two computers.",
    body,
    store: true,
    // Paddle.js is the one outside script on the site, and only here.
    scripts: selling() ? [`<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>`, storeScript()] : [],
  });
}

function thanksPage(read) {
  const base = `https://github.com/oliver-sogaard/cull-releases/releases/latest/download`;
  const body = read("pages/thanks.html")
    .replaceAll("{{storeAttrs}}", storeAttrs("thanks"))
    .replaceAll("{{downloadWindows}}", `${base}/CULL-setup.exe`)
    .replaceAll("{{downloadMac}}", `${base}/CULL.dmg`)
    .replaceAll("{{supportEmail}}", esc(config.supportEmail));
  return layout({
    slug: "thanks",
    title: "Your CULL Pro key",
    description: "The page that shows your CULL Pro key after payment.",
    body,
    store: true,
    // The address carries the id that unlocks the key: it is sent to no
    // other site, and the page runs nothing but its own script. GitHub Pages
    // sets no headers, so both rules are meta tags.
    head: [
      `<meta name="referrer" content="no-referrer" />`,
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src ${config.store.apiUrl}; base-uri 'none'; form-action 'none'" />`,
    ].join("\n    "),
    scripts: [storeScript()],
  });
}

function keyPage(read) {
  const s = config.store;
  const form = s.turnstileSiteKey
    ? `<p>Enter the email address you bought CULL Pro with.</p>
          <form class="lost" id="lost-form" novalidate>
            <input id="lost-email" type="email" name="email" autocomplete="email" placeholder="you@example.com" aria-label="Email address" required />
            <button class="btn btn--primary" type="submit" id="lost-send">Send my key</button>
            <div class="cf-turnstile lost__check" data-sitekey="${esc(s.turnstileSiteKey)}" data-theme="dark"></div>
            <p class="buy__trouble" id="lost-problem" role="alert" hidden></p>
          </form>`
    : `<p>Write to <a href="mailto:${esc(config.supportEmail)}">${esc(config.supportEmail)}</a> from the address you bought CULL Pro with, and the key is sent again.</p>`;
  const body = read("pages/key.html")
    .replaceAll("{{storeAttrs}}", storeAttrs("key"))
    .replaceAll("{{lostForm}}", form)
    .replaceAll("{{supportEmail}}", esc(config.supportEmail));
  return layout({
    slug: "key",
    title: "Lost your key? — CULL",
    description: "Have your CULL Pro key sent again to the address you bought it with.",
    body,
    store: true,
    scripts: s.turnstileSiteKey
      ? [`<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`, storeScript()]
      : [],
  });
}

function textPage({ slug, title, description, source, lead }) {
  const body = `      <article class="prose">
        <div class="eyebrow">${esc(title)}</div>
        ${lead ? `<p class="hero__lead">${inline(lead)}</p>` : ""}
        ${md(source).replace(/^<h1[^>]*>.*<\/h1>\n?/, "")}
      </article>`;
  return layout({ slug, title: `${title} — CULL`, description, body });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f);
    if (fs.statSync(a).isDirectory()) copyDir(a, path.join(to, f));
    else fs.copyFileSync(a, path.join(to, f));
  }
}

function sync() {
  const pairs = [
    ["CHANGELOG.md", "content/changelog.md"],
    ["legal/EULA.md", "content/terms.md"],
    ["legal/PRIVACY.md", "content/privacy.md"],
    ["docs/media/loupe.jpg", "assets/loupe.jpg"],
    ["docs/media/compare.jpg", "assets/compare.jpg"],
    ["docs/media/grid.jpg", "assets/grid.jpg"],
    ["src-tauri/icons/icon.png", "assets/app-icon.png"],
    ["src-tauri/icon-source.svg", "assets/app-icon.svg"],
    ["src-tauri/icons/64x64.png", "assets/icon-64.png"],
    ["src/assets/fonts/inter.woff2", "assets/fonts/inter.woff2"],
    ["src/assets/fonts/jetbrains-mono.woff2", "assets/fonts/jetbrains-mono.woff2"],
  ];
  for (const [src, dst] of pairs) {
    const a = path.join(app, src);
    if (!fs.existsSync(a)) throw new Error(`sync: ${a} is missing`);
    fs.mkdirSync(path.dirname(path.join(here, dst)), { recursive: true });
    fs.copyFileSync(a, path.join(here, dst));
  }
  console.log(`synced ${pairs.length} files from ${app}`);
}

function build() {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  copyDir(path.join(here, "assets"), path.join(out, "assets"));
  // GitHub Pages reads the custom domain from this file in the published
  // folder; the build empties that folder, so it writes the file again.
  fs.writeFileSync(path.join(out, "CNAME"), "cull.photography\n");

  const read = (p) => fs.readFileSync(path.join(here, p), "utf8");
  const pages = [
    {
      slug: "index",
      html: layout({
        slug: "index",
        title: "CULL — keyboard-fast culling for RAW photos",
        description:
          "CULL is a desktop app that culls a RAW shoot in minutes: keep, reject and favorite by keyboard, with verdicts saved where Lightroom reads them. Canon, Sony, Nikon, Fujifilm, Olympus, Panasonic and DNG.",
        body: read("pages/home.html").replaceAll("{{version}}", config.version).replaceAll("{{downloads}}", config.downloads),
        wide: true,
      }),
    },
    {
      slug: "formats",
      html: layout({
        slug: "formats",
        title: "Formats — CULL",
        description: "Which RAW formats CULL opens, and what each one gives: zoom to 100 %, the AF point, and burst grouping, measured body by body.",
        body: read("pages/formats.html"),
      }),
    },
    { slug: "pro", html: proPage(read) },
    { slug: "thanks", html: thanksPage(read) },
    { slug: "key", html: keyPage(read) },
    {
      slug: "changelog",
      html: textPage({
        slug: "changelog",
        title: "What's new",
        description: "Every CULL release, newest first.",
        source: read("content/changelog.md"),
      }),
    },
    {
      slug: "support",
      html: layout({
        slug: "support",
        title: "Support — CULL",
        description: "How to report a problem with CULL, and what a report contains.",
        body: read("pages/support.html")
          .replaceAll("{{supportEmailBlock}}", config.supportEmail
            ? `<p>Or write to <a href="mailto:${config.supportEmail}">${config.supportEmail}</a>.</p>`
            : ""),
      }),
    },
    {
      slug: "privacy",
      html: textPage({
        slug: "privacy",
        title: "Privacy policy",
        description: "What CULL keeps on your computer, what leaves it and when, and your rights.",
        source: read("content/privacy.md"),
      }),
    },
    {
      slug: "terms",
      html: textPage({
        slug: "terms",
        title: "License terms",
        description: "The terms under which CULL is licensed to you.",
        source: read("content/terms.md"),
      }),
    },
    {
      slug: "terms-of-sale",
      html: textPage({
        slug: "terms-of-sale",
        title: "Terms of sale",
        description: "The terms for buying CULL Pro: who sells it, refunds, and cancelling a subscription.",
        source: read("content/terms-of-sale.md"),
      }),
    },
    {
      slug: "press",
      html: layout({
        slug: "press",
        title: "Press kit — CULL",
        description: "Name, one-line description, icon and screenshots of CULL, free to use in coverage.",
        body: read("pages/press.html"),
      }),
    },
  ];
  for (const p of pages) fs.writeFileSync(path.join(out, `${p.slug}.html`), p.html);
  fs.writeFileSync(path.join(out, ".nojekyll"), "");
  console.log(`built ${pages.length} pages → ${out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--sync")) sync();
  build();
}
