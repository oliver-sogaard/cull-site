#!/usr/bin/env node
/**
 * cull-site build: content in `content/` (Markdown and the hero's data) and `pages/` (HTML
 * bodies) → `docs/` (what GitHub Pages serves, from the main branch). No dependencies: the
 * Markdown the legal texts and the changelog use is headings, paragraphs, lists, bold and
 * links, and that is what `md()` renders.
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
/** The app checkout `--sync` copies from: ../cull, or the folder in CULL_APP. */
const app = process.env.CULL_APP ? path.resolve(process.env.CULL_APP) : path.join(here, "..", "cull");

export const config = {
  name: "CULL",
  tagline: "Culling for RAW shoots",
  /** Where the site lives: canonical links, the share card and the sitemap are absolute. */
  url: "https://cull.photography/",
  /** The launch switch. false: every page says noindex to search engines. Flip on launch day. */
  released: false,
  downloads: "https://github.com/oliver-sogaard/cull-releases/releases/latest",
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
    env: "live",
    apiUrl: "https://api.cull.photography",
    clientToken: "live_75c26e26ca0766ef8d9dc59b61b",
    prices: {
      monthly: "pri_01m44rk0ctthtjsab1ckhy1f12",
      yearly: "pri_01m44rm72m3rx3v72tx345vykz",
      lifetime: "pri_01m44rmxqy4zmkxvbpvtxq64wt",
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

const selling = () => config.store.env === "sandbox" || config.store.env === "live";

/** A short content hash, so a changed file is fetched at once: GitHub
 *  Pages lets browsers keep a file for ten minutes. */
const assetHash = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(path.join(here, "assets", file))).digest("hex").slice(0, 10);
const asset = (file) => `./assets/${file}?v=${assetHash(file)}`;

/** A page's public address: the home page is the bare domain, the rest their file. */
const pageUrl = (slug) => (slug === "index" ? config.url : `${config.url}${slug}.html`);

/** The nav pill: the same on every page, the current page marked. On phones only Download and Pro stay. */
const navPill = (slug) =>
  [
    ["formats", "Formats", "link"],
    ["changelog", "What's new", "link"],
    ["support", "Support", "link"],
    ["install", "Download", "link dl"],
    ["pro", "Pro", "pro"],
  ]
    .map(([s, label, cls]) => `<a class="${cls}" href="./${s}.html"${slug === s ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");

/**
 * The shell every page shares: the nav pill, the footer. `head`: extra tags for this
 * page's head. `scripts`: script tags placed at the end of the body, in order. `store`:
 * one of the store's pages, which carry the test-mode strip while the checkout is
 * Paddle's sandbox. `home`: the body is the hero page and sets its own width.
 */
export function layout({ slug, title, description, body, home = false, head = "", scripts = [], store = false, bodyClass = "", index = true }) {
  const canonical = pageUrl(slug);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${index && config.released ? "" : `\n<meta name="robots" content="noindex">`}
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CULL">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${config.url}assets/site/og.jpg?v=${assetHash("site/og.jpg")}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Half Dome at sunset with the words: Five thousand frames. One evening. Five keys.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="./assets/icon-64.png">
<link rel="stylesheet" href="${asset("site.css")}">
<link rel="stylesheet" href="${asset("pages.css")}">
<script src="${asset("os.js")}"></script>${head ? `\n${head}` : ""}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>${store && config.store.env === "sandbox" ? `\n<div class="teststrip" role="note">Test mode · no real payment is taken on this page</div>` : ""}
<nav class="nav" aria-label="Site"><div class="pill glass"><a class="brand" href="./"${slug === "index" ? ' aria-current="page"' : ""}>CULL</a>${navPill(slug)}</div></nav>
<main id="top"${home ? "" : ' class="wrap page"'}>
${home ? body : `<div class="inner">\n${body}\n</div>`}
</main>
<footer class="foot wrap"><b>CULL</b><nav aria-label="Footer"><a href="./install.html">Install</a><a href="./formats.html">Formats</a><a href="./pro.html">Pro</a><a href="./changelog.html">What's new</a><a href="./support.html">Support</a><a href="./privacy.html">Privacy</a><a href="./terms.html">License terms</a><a href="./terms-of-sale.html">Terms of sale</a><a href="./press.html">Press kit</a></nav><span>© ${config.year} ${esc(config.owner)} · cull.photography</span></footer>${scripts.map((s) => `\n${s}`).join("")}
</body>
</html>
`;
}

/** The home page: the cull hero on the shoot's frames, then the app on real frames. */
function homePage(read) {
  const seq = JSON.parse(read("content/hero/seq2.json"));
  const SPR_COLS = 24;
  const data = [
    ["seq", JSON.stringify(seq)],
    ["sets", read("content/hero/sets2.json").trim()],
    ["bursts", read("content/hero/bursts2.json").trim()],
  ]
    .map(([id, json]) => `<script id="${id}" type="application/json">${json}</script>`)
    .join("\n");
  const body = read("pages/home.html")
    .replaceAll("{{sprCols}}", String(SPR_COLS))
    .replaceAll("{{sprRows}}", String(Math.ceil(seq.length / SPR_COLS)))
    .replaceAll("{{downloads}}", config.downloads) + "\n" + data;
  return layout({
    slug: "index",
    home: true,
    title: "CULL · culling for RAW shoots",
    description:
      "CULL is the step before Lightroom: open the folder, judge each frame with one key, and the verdicts are already there when you import. Canon, Sony, Nikon, Fujifilm, Olympus, Panasonic, Leica and DNG. Windows and Mac.",
    body,
    head: [
      `<link rel="preload" as="image" href="${asset("site/sheet-desk.jpg")}" media="(min-width: 761px)">`,
      `<link rel="preload" as="image" href="${asset("site/sheet-phone.jpg")}" media="(max-width: 760px)">`,
    ].join("\n"),
    scripts: [`<script src="${asset("hero.js")}"></script>`, `<script src="${asset("home.js")}"></script>`],
  });
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

const storeScript = () => `<script src="${asset("store.js")}" defer></script>`;

/** A buy button, or nothing while the store is off. */
const buyButton = (plan, label, primary) =>
  selling()
    ? `<button class="btn${primary ? "" : " btn--sm btn--ghost"}" type="button" data-buy="${plan}">${label}</button>`
    : "";

function proPage(read) {
  const supportBlock = config.supportEmail
    ? `<p>Support: <a href="mailto:${config.supportEmail}">${config.supportEmail}</a>.</p>`
    : "";
  const body = read("pages/pro.html")
    .replaceAll("{{storeAttrs}}", storeAttrs("pro"))
    .replaceAll("{{buyLifetime}}", buyButton("lifetime", "Buy Lifetime →", true))
    .replaceAll("{{buyYearly}}", buyButton("yearly", "Buy Yearly", false))
    .replaceAll("{{buyMonthly}}", buyButton("monthly", "Buy Monthly", false))
    .replaceAll(
      "{{storeNote}}",
      selling()
        ? ""
        : `<p class="buy__fine">Sales open soon. Until then there is nothing to buy here. Free culls up to 250 frames in one session, with no time limit.</p>`,
    )
    .replaceAll("{{supportEmailBlock}}", supportBlock);
  return layout({
    slug: "pro",
    title: "CULL Pro · prices and how a license works",
    description: "What CULL Pro costs (monthly, yearly or once for life), and how a license key works on two computers.",
    body,
    store: true,
    // Paddle.js is the one outside script on the site, and only here.
    scripts: selling() ? [`<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>`, storeScript()] : [],
  });
}

/** The installers under their fixed names (the release workflow keeps a
 *  copy of each without the version in its name). */
const DL = "https://github.com/oliver-sogaard/cull-releases/releases/latest/download";

function thanksPage(read) {
  const body = read("pages/thanks.html")
    .replaceAll("{{storeAttrs}}", storeAttrs("thanks"))
    .replaceAll("{{downloadWindows}}", `${DL}/CULL-setup.exe`)
    .replaceAll("{{downloadMac}}", `${DL}/CULL.dmg`)
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
      `<meta name="referrer" content="no-referrer">`,
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src ${config.store.apiUrl}; base-uri 'none'; form-action 'none'">`,
    ].join("\n"),
    scripts: [storeScript()],
  });
}

function keyPage(read) {
  const s = config.store;
  const form = s.turnstileSiteKey
    ? `<p class="lead">Enter the email address you bought CULL Pro with.</p>
<form class="lost" id="lost-form" novalidate>
<input id="lost-email" type="email" name="email" autocomplete="email" placeholder="you@example.com" aria-label="Email address" required>
<button class="btn" type="submit" id="lost-send">Send my key</button>
<div class="cf-turnstile lost__check" data-sitekey="${esc(s.turnstileSiteKey)}" data-theme="dark"></div>
<p class="buy__trouble" id="lost-problem" role="alert" hidden></p>
</form>`
    : `<p class="lead">Write to <a href="mailto:${esc(config.supportEmail)}">${esc(config.supportEmail)}</a> from the address you bought CULL Pro with, and the key is sent again.</p>`;
  const body = read("pages/key.html")
    .replaceAll("{{storeAttrs}}", storeAttrs("key"))
    .replaceAll("{{lostForm}}", form)
    .replaceAll("{{supportEmail}}", esc(config.supportEmail));
  return layout({
    slug: "key",
    title: "Lost your key? · CULL",
    description: "Have your CULL Pro key sent again to the address you bought it with.",
    body,
    store: true,
    scripts: s.turnstileSiteKey
      ? [`<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`, storeScript()]
      : [],
  });
}

/** A text page from Markdown: the title as the display line, the text at reading width. */
function textPage({ slug, title, description, source, intro, bodyClass = "" }) {
  const body = `<div class="head2"><p class="two">${esc(title)}${intro ? ` <span class="g">${inline(intro)}</span>` : ""}</p></div>
<article class="prose">
${md(source).replace(/^<h1[^>]*>.*<\/h1>\n?/, "")}
</article>`;
  return layout({ slug, title: `${title} · CULL`, description, body, bodyClass });
}

/** GitHub Pages serves this at every address that does not exist, at any depth, so
 *  its links and assets are absolute; the shell's relative ones are rewritten. */
function notFoundPage(read) {
  const html = layout({
    slug: "404",
    title: "Not here · CULL",
    description: "There is no page at this address.",
    body: read("pages/404.html"),
    index: false,
  });
  return html.replaceAll('href="./', 'href="/').replaceAll('src="./', 'src="/');
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
  // Empty the folder rather than remove it: a shell or server sitting in it would refuse the removal.
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) fs.rmSync(path.join(out, f), { recursive: true, force: true });
  copyDir(path.join(here, "assets"), path.join(out, "assets"));
  // The hero sprites are referenced from the stylesheet without a query; a sprite whose rows
  // change must never be drawn from a cached copy, so the built stylesheet names them by content.
  const cssOut = path.join(out, "assets", "site.css");
  fs.writeFileSync(
    cssOut,
    fs.readFileSync(cssOut, "utf8")
      .replaceAll("url(./site/sheet-desk.jpg)", `url(./site/sheet-desk.jpg?v=${assetHash("site/sheet-desk.jpg")})`)
      .replaceAll("url(./site/sheet-phone.jpg)", `url(./site/sheet-phone.jpg?v=${assetHash("site/sheet-phone.jpg")})`),
  );
  // GitHub Pages reads the custom domain from this file in the published
  // folder; the build empties that folder, so it writes the file again.
  fs.writeFileSync(path.join(out, "CNAME"), "cull.photography\n");

  const read = (p) => fs.readFileSync(path.join(here, p), "utf8");
  const pages = [
    { slug: "index", html: homePage(read) },
    {
      slug: "formats",
      html: layout({
        slug: "formats",
        title: "Formats · CULL",
        description: "Which RAW formats CULL opens, what each one gives, and where a verdict is written.",
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
        title: "What's new.",
        intro: "Every release, newest first. The app updates itself.",
        description: "Every CULL release, newest first.",
        source: read("content/changelog.md"),
        bodyClass: "changelog",
      }),
    },
    {
      slug: "support",
      html: layout({
        slug: "support",
        title: "Support · CULL",
        description: "How to report a problem with CULL, and what a report contains.",
        body: read("pages/support.html")
          .replaceAll("{{supportEmailBlock}}", config.supportEmail
            ? `<p>Or write to <a href="mailto:${config.supportEmail}">${config.supportEmail}</a>.</p>`
            : ""),
      }),
    },
    {
      slug: "install",
      html: layout({
        slug: "install",
        title: "Install CULL",
        description:
          "Download CULL for Windows or Mac, what the first launch says about an unsigned installer, and how to check a download by its checksum.",
        body: read("pages/install.html")
          .replaceAll("{{downloads}}", config.downloads)
          .replaceAll("{{downloadWindows}}", `${DL}/CULL-setup.exe`)
          .replaceAll("{{downloadMac}}", `${DL}/CULL.dmg`),
      }),
    },
    {
      slug: "privacy",
      html: textPage({
        slug: "privacy",
        title: "Privacy.",
        intro: "What CULL keeps on your computer, what leaves it and when, and your rights.",
        description: "What CULL keeps on your computer, what leaves it and when, and your rights.",
        source: read("content/privacy.md"),
      }),
    },
    {
      slug: "terms",
      html: textPage({
        slug: "terms",
        title: "License terms.",
        intro: "The terms under which CULL is licensed to you.",
        description: "The terms under which CULL is licensed to you.",
        source: read("content/terms.md"),
      }),
    },
    {
      slug: "terms-of-sale",
      html: textPage({
        slug: "terms-of-sale",
        title: "Terms of sale.",
        intro: "Who sells CULL Pro, refunds, and canceling a subscription.",
        description: "The terms for buying CULL Pro: who sells it, refunds, and canceling a subscription.",
        source: read("content/terms-of-sale.md"),
      }),
    },
    {
      slug: "press",
      html: layout({
        slug: "press",
        title: "Press kit · CULL",
        description: "Name, one-line description, icon and screenshots of CULL, free to use in coverage.",
        body: read("pages/press.html"),
      }),
    },
  ];
  for (const p of pages) fs.writeFileSync(path.join(out, `${p.slug}.html`), p.html);
  fs.writeFileSync(path.join(out, "404.html"), notFoundPage(read));
  // The post-purchase page is reached from the checkout, not from a search.
  const listed = pages.filter((p) => p.slug !== "thanks");
  fs.writeFileSync(
    path.join(out, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map((p) => `  <url><loc>${pageUrl(p.slug)}</loc></url>`).join("\n")}\n</urlset>\n`,
  );
  fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nDisallow: /thanks.html\n\nSitemap: ${config.url}sitemap.xml\n`);
  fs.writeFileSync(path.join(out, ".nojekyll"), "");
  console.log(`built ${pages.length} pages → ${out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--sync")) sync();
  build();
}
