import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content", "blog");
const DIST = path.join(ROOT, "dist");
const SITE_URL = (process.env.SITE_URL || "https://nemo1st.dev").replace(/\/$/, "");
const BASE_PATH = (process.env.BASE_PATH || "").replace(/^\/?/, "/").replace(/\/$/, "").replace(/^\/$/, "");
const CUSTOM_DOMAIN = (process.env.CUSTOM_DOMAIN || "").trim();
const SITE_NAME = "nemo1st.dev";
const GITHUB_URL = "https://github.com/nemo1st";
const SHORTS = [
  {
    title: "作ったものを誰かが使ってくれている",
    date: "2026-09-04",
    body: "趣味で運営しているファンサイトを、今日は大規模アップデートしました。普段は過去30分で7人ほど、今日は12人前後のアクティブユーザーが続いています。コンテンツ運営は苦労も多いですが、自分の作ったものを大勢の人に楽しんでもらえていると思うと、やっぱり嬉しいです。表には出せない制作物が多いぶん、こういう数字を見ると少し報われた気持ちになります。",
    image: "/assets/shorts/fansite-active-users.png",
    imageAlt: "過去30分のアクティブユーザー数が12人と表示されたアクセス解析画面",
  },
];

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const escapeXml = escapeHtml;

function parseScalar(raw) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) return value.slice(1, -1).split(",").map((item) => parseScalar(item)).filter(Boolean);
  return value;
}

function parseDocument(source, filename) {
  const normalized = source.replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) throw new Error(`${filename}: Front Matterがありません。`);
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) throw new Error(`${filename}: Front Matterの閉じる --- がありません。`);
  const meta = {};
  let currentKey = null;
  for (const line of normalized.slice(4, end).split("\n")) {
    const pair = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (pair) { currentKey = pair[1]; meta[currentKey] = pair[2] ? parseScalar(pair[2]) : []; continue; }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && currentKey && Array.isArray(meta[currentKey])) meta[currentKey].push(parseScalar(item[1]));
  }
  const body = normalized.slice(end + 5).trim();
  const slug = path.basename(filename, path.extname(filename));
  for (const key of ["title", "date", "description"]) if (!meta[key]) throw new Error(`${filename}: ${key} を指定してください。`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(meta.date))) throw new Error(`${filename}: date は YYYY-MM-DD 形式にしてください。`);
  if (!Array.isArray(meta.tags)) meta.tags = meta.tags ? [meta.tags] : [];
  return { ...meta, slug, body, source: filename, draft: meta.draft === true };
}

function safeHref(value) {
  const href = String(value).trim();
  return /^(https?:\/\/|\/|#)/.test(href) ? href : "#";
}
function sitePath(pathname) { return pathname.startsWith("/") ? (`${BASE_PATH}${pathname}` || "/") : pathname; }
function absoluteUrl(pathname) { return `${SITE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`; }
function formatDate(value) { return String(value).replaceAll("-", "."); }
function icon(name, label = "") { return `<img class="icon" src="${sitePath(`/assets/icons/${name}.svg`)}" alt="${escapeHtml(label)}"${label ? "" : ' aria-hidden="true"'}>`; }

function renderInline(text) {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  return String(text).split(pattern).filter(Boolean).map((part) => {
    if (part.startsWith("`") && part.endsWith("`")) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    if (part.startsWith("**") && part.endsWith("**")) return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      const external = /^https?:\/\//.test(href);
      return `<a href="${escapeHtml(external || href.startsWith("#") ? href : sitePath(href))}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(link[1])}</a>`;
    }
    return escapeHtml(part);
  }).join("");
}

function makeHeadingId(text, index, used) {
  const base = String(text).normalize("NFKC").toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "") || `section-${index}`;
  let id = base; let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id); return id;
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [], toc = [], usedIds = new Set(); let index = 0;
  const isBlockStart = (line) => /^(#{2,4})\s+|^```|^>\s?|^[-*]\s+|^\d+\.\s+|^!\[[^\]]*\]\([^)]+\)$/.test(line);
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith("```")) {
      const language = line.slice(3).trim(), code = []; index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(`<div class="code-block">${language ? `<div class="code-label">${escapeHtml(language)}</div>` : ""}<pre><code>${escapeHtml(code.join("\n"))}</code></pre></div>`); continue;
    }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length, id = makeHeadingId(heading[2], index, usedIds);
      toc.push({ level, id, text: heading[2] });
      blocks.push(`<h${level} id="${escapeHtml(id)}">${renderInline(heading[2])}<a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="この見出しへのリンク">#</a></h${level}>`); index += 1; continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) { const src = safeHref(image[2]); blocks.push(`<figure><img src="${escapeHtml(src.startsWith("/") ? sitePath(src) : src)}" alt="${escapeHtml(image[1])}" loading="lazy"><figcaption>${escapeHtml(image[1])}</figcaption></figure>`); index += 1; continue; }
    if (/^>\s?/.test(line)) { const quote = []; while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, "")); blocks.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`); continue; }
    const unordered = /^[-*]\s+/.test(line), ordered = /^\d+\.\s+/.test(line);
    if (unordered || ordered) {
      const matcher = unordered ? /^[-*]\s+/ : /^\d+\.\s+/, items = [];
      while (index < lines.length && matcher.test(lines[index])) items.push(lines[index++].replace(matcher, ""));
      const tag = ordered ? "ol" : "ul"; blocks.push(`<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`); continue;
    }
    const paragraph = [line.trim()]; index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }
  return { html: blocks.join("\n"), toc };
}

function navLink(href, label, current) { return `<a href="${sitePath(href)}"${current === href ? ' aria-current="page"' : ""}>${label}</a>`; }
function footer() {
  return `<footer class="site-footer"><div class="container footer-main"><div class="footer-brand"><a class="footer-title" href="${sitePath("/")}">${SITE_NAME}</a><p>仕組みを深掘りしてハックするのが好きなソフトウェアエンジニアの記録です。</p><div class="socials"><a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer" aria-label="GitHub">${icon("github")}</a><a href="${sitePath("/rss.xml")}" aria-label="RSS">${icon("rss")}</a></div></div><div class="footer-columns"><div><h2>Content</h2><a href="${sitePath("/blog/")}">Blog</a><a href="${sitePath("/blog/#shorts")}">Shorts</a><a href="${sitePath("/talks/")}">Talks</a></div><div><h2>Site</h2><a href="${sitePath("/about/")}">About</a><a href="${sitePath("/rss.xml")}">RSS</a><a href="${sitePath("/llms.txt")}">llms.txt</a></div></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} nemo1st</span><span>Markdown + Vercel</span></div></footer>`;
}

let searchPosts = [];
function layout({ title, description, pathname, current = "", body, type = "website", date, jsonLd }) {
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;
  const canonical = absoluteUrl(pathname), ogImage = absoluteUrl("/og.png");
  const searchJson = JSON.stringify(searchPosts.map(({ title: postTitle, description: postDescription, slug }) => ({ title: postTitle, description: postDescription, href: sitePath(`/blog/${slug}/`) }))).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="ja" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(fullTitle)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="${sitePath("/styles.css")}"><link rel="stylesheet" href="${sitePath("/site.css")}"><link rel="stylesheet" href="${sitePath("/signal-red.css")}"><meta property="og:type" content="${type}"><meta property="og:site_name" content="${SITE_NAME}"><meta property="og:title" content="${escapeHtml(fullTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${ogImage}">${date ? `<meta property="article:published_time" content="${escapeHtml(date)}">` : ""}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(fullTitle)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${ogImage}"><script>document.documentElement.classList.add("js");try{const t=localStorage.getItem("nemo-theme")||"dark";document.documentElement.classList.toggle("dark",t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))}catch{}</script>${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script>` : ""}</head><body><a class="skip-link" href="#main">本文へ移動</a><header class="site-header"><div class="header-inner"><div class="header-brand"><button class="menu-toggle" type="button" data-menu-toggle aria-label="メニューを開く" aria-expanded="false">${icon("menu")}</button><a class="wordmark" href="${sitePath("/")}" aria-label="nemo1st ホーム">Nemo<span>1st</span></a></div><nav class="site-nav" data-site-nav aria-label="メインナビゲーション">${navLink("/blog/", "Blog", current)}${navLink("/about/", "About", current)}${navLink("/talks/", "Talks", current)}</nav><div class="nav-actions"><button class="search-trigger" type="button" data-search-open aria-label="検索">${icon("search")}<span>Search</span><kbd>⌘ K</kbd></button><button class="theme-toggle" type="button" data-theme-toggle aria-label="テーマを切り替える">${icon("system")}</button><span class="locale" aria-label="表示言語"><strong>JA</strong><span>EN</span></span><a class="header-icon" href="${sitePath("/rss.xml")}" aria-label="RSS">${icon("rss")}</a><a class="header-icon" href="${sitePath("/llms.txt")}" aria-label="llms.txt">${icon("robot")}</a><a class="header-icon" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer" aria-label="GitHub">${icon("github")}</a></div></div></header>${body}${footer()}<dialog class="search-dialog" data-search-dialog><form method="dialog" class="search-panel"><div class="search-field">${icon("search")}<input data-search-input type="search" placeholder="記事を検索" aria-label="記事を検索"><button value="cancel" aria-label="検索を閉じる">${icon("x-mark")}</button></div><div class="search-results" data-search-results><p>タイトルや概要から記事を検索できます。</p></div></form></dialog><script type="application/json" id="search-index">${searchJson}</script><script src="${sitePath("/site.js")}" defer></script></body></html>`;
}

function tagsHtml(tags) { return `<div class="tags">${tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>`; }
function thumbnail(post, index = 0) { const source = post.thumbnail || `/assets/placeholders/thumb-${(index % 4) + 1}.svg`; return sitePath(source); }
function postCard(post, index = 0) {
  const number = String(index + 1).padStart(2, "0");
  const visual = post.thumbnail
    ? `<img src="${thumbnail(post, index)}" alt="" loading="lazy">`
    : `<span class="post-file"><span>FILE / ${number}</span><b>${number}</b><code>${escapeHtml(post.slug)}</code></span>`;
  return `<article class="post-card"><a class="post-thumb" href="${sitePath(`/blog/${encodeURIComponent(post.slug)}/`)}" tabindex="-1" aria-hidden="true">${visual}</a><div class="post-content"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time><h3><a href="${sitePath(`/blog/${encodeURIComponent(post.slug)}/`)}">${escapeHtml(post.title)}</a></h3><p>${escapeHtml(post.description)}</p>${tagsHtml(post.tags)}</div></article>`;
}
function featuredPost(post) {
  const href = sitePath(`/blog/${encodeURIComponent(post.slug)}/`);
  const visual = post.thumbnail
    ? `<span class="featured-media"><img src="${thumbnail(post)}" alt=""></span>`
    : '<span class="featured-index" aria-hidden="true"><b>01</b><i>Latest</i></span>';
  return `<article class="featured-post"><a class="featured-link" href="${href}">${visual}<div class="featured-copy"><div class="featured-meta"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time><span>Featured article</span></div><h3 class="featured-title">${escapeHtml(post.title)}</h3><p class="featured-description">${escapeHtml(post.description)}</p><div class="featured-footer">${tagsHtml(post.tags)}<span class="featured-cta">記事を読む ${icon("arrow-right")}</span></div></div></a></article>`;
}
function latestPost(post, index) {
  const href = sitePath(`/blog/${encodeURIComponent(post.slug)}/`);
  return `<article class="latest-item"><a href="${href}"><span class="latest-number" aria-hidden="true">${String(index + 2).padStart(2, "0")}</span><div class="latest-summary"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.description)}</p></div><div class="latest-tail">${tagsHtml(post.tags)}${icon("arrow-right")}</div></a></article>`;
}
function sectionHeading(label, href = "", linkLabel = "") { return `<div class="section-heading"><h2>${label}</h2>${href ? `<a href="${sitePath(href)}">${linkLabel} ${icon("arrow-right")}</a>` : ""}</div>`; }
function shortList(items = SHORTS) { return `<div class="short-list">${items.map((item, i) => `<article class="short-item"><img class="short-avatar" src="${sitePath("/assets/avatar.jpeg")}" alt="" width="40" height="40"><div><div class="short-head"><div><strong>nemo1st</strong><h3>${escapeHtml(item.title)}</h3></div><time datetime="${item.date}">${formatDate(item.date)}</time></div><p>${escapeHtml(item.body)}</p>${item.image ? `<img class="short-image" src="${sitePath(item.image)}" alt="${escapeHtml(item.imageAlt || "")}" loading="lazy">` : ""}${i === 0 ? '<span class="thread-button">スレッドを開く <b>1</b></span>' : ""}</div></article>`).join("")}</div>`; }
function emptyTimeline() { return `<div class="timeline"><div class="timeline-year">Soon</div><div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-card"><p class="timeline-kicker">Talks archive</p><h3>登壇記録を準備しています</h3><p>公開できる資料やイベントの記録を、ここへ時系列で追加していきます。</p></div></div></div>`; }

async function writePage(relative, html) { const target = path.join(DIST, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, html, "utf8"); }
async function copyStaticAssets() {
  await cp(path.join(ROOT, "tokens"), path.join(DIST, "tokens"), { recursive: true });
  await cp(path.join(ROOT, "assets"), path.join(DIST, "assets"), { recursive: true });
  await cp(path.join(ROOT, "site", "public"), DIST, { recursive: true });
  await cp(path.join(ROOT, "styles.css"), path.join(DIST, "styles.css"));
  await cp(path.join(ROOT, "site", "site.css"), path.join(DIST, "site.css"));
  await cp(path.join(ROOT, "site", "signal-red.css"), path.join(DIST, "signal-red.css"));
  await cp(path.join(ROOT, "site", "site.js"), path.join(DIST, "site.js"));
  if (CUSTOM_DOMAIN) await writeFile(path.join(DIST, "CNAME"), `${CUSTOM_DOMAIN}\n`, "utf8");
}
async function loadPosts() {
  const files = (await readdir(CONTENT)).filter((file) => file.endsWith(".md")).sort(), posts = [];
  for (const file of files) { const post = parseDocument(await readFile(path.join(CONTENT, file), "utf8"), file); if (!post.draft) posts.push(post); }
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const duplicates = posts.filter((post, index) => posts.findIndex((candidate) => candidate.slug === post.slug) !== index);
  if (duplicates.length) throw new Error(`記事スラッグが重複しています: ${duplicates.map((post) => post.slug).join(", ")}`);
  return posts;
}

async function build() {
  await rm(DIST, { recursive: true, force: true }); await mkdir(DIST, { recursive: true }); await copyStaticAssets();
  const posts = await loadPosts(); searchPosts = posts;
  const [featured, ...rest] = posts;
  const osMarkMarkup = `<div class="intro-os-mark" data-intro-os-mark><svg viewBox="0 0 420 420" role="presentation"><g class="os-guides"><circle cx="210" cy="210" r="154"/><circle cx="210" cy="210" r="106"/><line x1="34" y1="210" x2="386" y2="210"/><line x1="210" y1="34" x2="210" y2="386"/><line x1="86" y1="86" x2="334" y2="334"/><line x1="86" y1="334" x2="334" y2="86"/></g><g class="os-draw"><circle cx="210" cy="210" r="126" pathLength="1"/><path d="M142 286V134L278 286V134" pathLength="1"/><path d="M126 306L294 114" pathLength="1"/></g><g class="os-nodes"><circle cx="142" cy="286" r="5"/><circle cx="142" cy="134" r="5"/><circle cx="278" cy="286" r="5"/><circle cx="278" cy="134" r="5"/></g><g class="os-final"><circle cx="210" cy="210" r="126"/><path d="M142 286V134L278 286V134"/><path d="M126 306L294 114"/></g></svg><div class="intro-os-caption"><strong>N/OS</strong><span>signal operating system</span></div></div>`;
  const introMarkup = `<div class="site-intro" data-site-intro data-palette="11"><canvas data-intro-canvas aria-hidden="true"></canvas><div class="intro-deck"><section class="intro-identity"><div class="hero-panel-label"><span>PERSONAL NETWORK</span><b>SYS.01</b></div><div class="hero-brand intro-brand"><span class="hero-orbit" aria-hidden="true"><i></i></span><h1><span>Nemo</span><b>1st</b></h1><p>software engineer / tokyo</p></div><div class="intro-startup-note"><span>RESTARTING NEMO OS / VER.1.33</span><p>USER ID: NEMO1ST<br>DATA FLOW IS FOR REGISTERED USE ONLY.</p></div></section><section class="intro-interface"><div class="hero-panel-label"><span>DATA FLOW / 40</span><b data-intro-state>INITIALIZING</b></div><div class="intro-viewport" aria-hidden="true">${osMarkMarkup}</div><ol class="intro-modules"><li data-intro-step><b>01</b><span>CORE</span><small>memory map</small><em>WAIT</em></li><li data-intro-step><b>02</b><span>RENDER</span><small>organic shader</small><em>WAIT</em></li><li data-intro-step><b>03</b><span>INDEX</span><small>content registry</small><em>WAIT</em></li><li data-intro-step><b>04</b><span>INTERFACE</span><small>input controls</small><em>WAIT</em></li></ol><div class="intro-footer"><div class="intro-meter" aria-hidden="true"><i data-intro-meter></i></div><div><code data-intro-log>Allocating runtime memory...</code><strong data-intro-progress>000%</strong></div></div></section></div><button class="intro-skip" type="button" data-intro-skip>Skip sequence</button></div>`;
  const homeBody = `<main id="main">${introMarkup}<section class="hero">
    <div class="hero-copy"><p class="eyebrow">Software Engineer / Tokyo</p><h1>Nemo<b>1st</b></h1><p>Web開発から低レイヤー・データ構造解析、開発自動化まで。仕組みを深掘りしてハックするのが好きです。</p><div class="hero-actions"><a class="button button-primary" href="${sitePath("/blog/")}">Read the blog ${icon("arrow-right")}</a><a class="button" href="${sitePath("/about/")}">About me</a></div></div>
    <aside class="hero-terminal" aria-label="N/OS Personal archive"><div class="terminal-bar"><span>N/OS</span><span>PERSONAL ARCHIVE</span></div><div class="hero-mark-field" aria-hidden="true"><svg class="hero-system-mark" viewBox="0 0 420 420"><g class="hero-mark-guides"><circle cx="210" cy="210" r="154"/><line x1="20" y1="210" x2="400" y2="210"/><line x1="210" y1="20" x2="210" y2="400"/></g><g class="hero-mark-symbol"><circle cx="210" cy="210" r="126"/><path d="M142 286V134L278 286V134"/><path d="M126 306L294 114"/></g></svg></div><nav class="hero-directory" aria-label="アーカイブ"><a href="${sitePath("/blog/")}"><span>01 / Blog</span>${icon("arrow-right")}</a><a href="${sitePath("/blog/#shorts")}"><span>02 / Shorts</span>${icon("arrow-right")}</a><a href="${sitePath("/talks/")}"><span>03 / Talks</span>${icon("arrow-right")}</a></nav></aside>
  </section><div class="home-content container"><section class="latest-articles">${sectionHeading("Latest articles", "/blog/", "もっと見る")}${featured ? featuredPost(featured) : '<div class="empty">公開済みの記事はまだありません。</div>'}${rest.length ? `<div class="latest-list">${rest.slice(0, 3).map(latestPost).join("")}</div>` : ""}</section><section id="shorts">${sectionHeading("Shorts")}${shortList()}</section><section>${sectionHeading("Talks", "/talks/", "すべての登壇")}${emptyTimeline()}</section></div></main>`;
  await writePage("index.html", layout({ title: SITE_NAME, description: "nemo1stのソフトウェアエンジニアリングノート。", pathname: "/", body: homeBody }));

  const blogBody = `<main id="main"><section class="page-banner"><div><h1>Blog</h1><p>読んだ仕様と、手を動かした記録を置いています。</p></div></section><section class="blog-shell container"><div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="blog">Blog</button><button role="tab" aria-selected="false" data-tab="shorts">Shorts</button></div><div data-panel="blog">${posts.length ? `<div class="post-grid">${posts.map(postCard).join("")}</div>` : '<div class="empty">公開済みの記事はまだありません。</div>'}</div><div data-panel="shorts" id="shorts" hidden>${shortList()}</div></section></main>`;
  await writePage("blog/index.html", layout({ title: "Blog", description: "nemo1stの技術記事一覧。", pathname: "/blog/", current: "/blog/", body: blogBody }));

  for (let i = 0; i < posts.length; i += 1) {
    const post = posts[i], rendered = renderMarkdown(post.body);
    const toc = rendered.toc.length ? `<aside class="toc" aria-label="目次"><button type="button" data-toc-toggle aria-expanded="true">${icon("menu-lines")}<span>目次</span>${icon("chevron-down")}</button><nav data-toc-list>${rendered.toc.map((item) => `<a href="#${escapeHtml(item.id)}" class="level-${item.level}">${escapeHtml(item.text)}</a>`).join("")}</nav></aside>` : "";
    const related = posts.filter((candidate) => candidate.slug !== post.slug).slice(0, 3);
    const articleBody = `<main id="main" class="article-page"><div class="breadcrumb"><a href="${sitePath("/blog/")}">blog</a><span>&gt;</span><span>${escapeHtml(post.title)}</span></div><div class="article-layout"><div class="article-main"><header class="article-header">${post.thumbnail ? `<img src="${thumbnail(post, i)}" alt="">` : '<p class="eyebrow">Blog / Field notes</p>'}<h1>${escapeHtml(post.title)}</h1><div class="article-meta">${icon("calendar")}<time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time></div>${tagsHtml(post.tags)}<p>${escapeHtml(post.description)}</p></header><article class="article-body">${rendered.html}</article><div class="article-author"><div><h2>Contributors</h2><a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer"><img src="${sitePath("/assets/avatar.jpeg")}" alt="nemo1st" width="40" height="40"><span>nemo1st</span></a></div><div><h2>Share</h2><button type="button" data-copy-url>${icon("share")}リンクをコピー</button><a href="${GITHUB_URL}/nemo1st.dev/edit/main/content/blog/${encodeURIComponent(post.source)}" target="_blank" rel="noopener noreferrer">${icon("github")}GitHubで編集</a></div></div>${related.length ? `<section class="related">${sectionHeading("関連記事")}<div class="post-grid">${related.map(postCard).join("")}</div></section>` : ""}</div>${toc}</div></main>`;
    const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, datePublished: post.date, author: { "@type": "Person", name: "nemo1st", url: GITHUB_URL }, mainEntityOfPage: absoluteUrl(`/blog/${post.slug}/`) };
    await writePage(`blog/${post.slug}/index.html`, layout({ title: post.title, description: post.description, pathname: `/blog/${post.slug}/`, current: "/blog/", body: articleBody, type: "article", date: post.date, jsonLd }));
  }

  const facts = [["backend", "Python / Rails / .NET"], ["infra", "設計・構築・保守"], ["ci/cd", "GitHub Actions"], ["workflow", "AI 開発効率化"], ["community", "技術支援"], ["next gen", "コンテスト支援"]];
  const interview = [
    ["まず、何をしている人ですか？", "Webアプリケーション開発を中心に、インフラやデータ構造の解析まで幅広く手を動かすソフトウェアエンジニアです。「仕組みを知り、仕組みを最適化する」のが好きなWebエンジニアです。"],
    ["得意領域と技術スタックを教えてください。", `<dl class="stack-list"><div><dt data-interview-text>Backend</dt><dd data-interview-text>Python, Ruby on Rails, .NET</dd></div><div><dt data-interview-text>Infrastructure &amp; Ops</dt><dd data-interview-text>サーバー設計・構築、ドメイン管理、ランタイムやフレームワークのバージョンアップ・保守運用</dd></div><div><dt data-interview-text>CI/CD</dt><dd data-interview-text>GitHub Actionsを活用したビルド・テスト・デプロイの自動化</dd></div><div><dt data-interview-text>Workflow &amp; AI</dt><dd data-interview-text>AIアシスタントを活用した要件整理・実装・レビューの効率化</dd></div></dl>`],
    ["強みとスタンスは？", "ブラックボックスになりがちなライブラリの内部挙動やデータ構造を徹底的に読み解き、根本原因を解決するトラブルシューティングを得意としています。また、安定した長期運用を見据えたリファクタリングや環境移行を確実にやり遂げる推進力があります。"],
    ["仕事以外では何をしていますか？", "趣味でもコミュニティ向けのツール開発やゲームデータ解析など、手を動かして形にすることに情熱を注いでいます。技術コミュニティへの還元や、中高生向けプログラミングコンテストの支援など、次世代育成にも取り組んでいます。"],
  ];
  const aboutBody = `<main id="main" class="about-page"><div class="about-layout"><div><header class="about-masthead"><img src="${sitePath("/assets/avatar.jpeg")}" alt="nemo1st" width="96" height="96"><div><p class="eyebrow">About</p><h1>nemo1st</h1><p class="role">Software Engineer</p><p class="lede">フルスタックエンジニア。Web開発から低レイヤー・データ構造解析、開発自動化まで「仕組みを深掘りしてハックする」のが好きです。快適な作業環境づくりと、コミュニティ向けのものづくり・技術支援にも力を入れています。</p></div></header><section class="interview" data-interview><div class="section-heading"><h2>Interview</h2><button type="button" data-interview-skip>skip →</button></div>${interview.map(([q, a], index) => `<article data-interview-item><span>${String(index + 1).padStart(2, "0")}</span><div><h2>${q}</h2><div class="answer">${a.startsWith("<") ? a : `<p data-interview-text>${a}</p>`}</div></div></article>`).join("")}<p class="transcript-end" data-interview-end>— end of transcript</p></section></div><aside class="meta-rail"><section><h2>Profile</h2><dl>${facts.map(([key, value], index) => `<div><dt>${key}</dt><dd${index > 3 ? ' class="accent"' : ""}>${value}</dd></div>`).join("")}</dl></section><section><h2>Elsewhere</h2><a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">${icon("github")}GitHub</a><a href="${sitePath("/rss.xml")}">${icon("rss")}RSS</a></section><section><h2>Navigate</h2><a href="${sitePath("/blog/")}">→ blog</a><a href="${sitePath("/blog/#shorts")}">→ shorts</a><a href="${sitePath("/talks/")}">→ talks</a></section></aside></div></main>`;
  await writePage("about/index.html", layout({ title: "About", description: "nemo1stについて。", pathname: "/about/", current: "/about/", body: aboutBody }));

  const talksBody = `<main id="main"><section class="page-banner"><div><h1>Talks</h1><p>勉強会やカンファレンスで話した記録です。</p></div></section><section class="talks-page">${emptyTimeline()}</section></main>`;
  await writePage("talks/index.html", layout({ title: "Talks", description: "nemo1stの登壇記録。", pathname: "/talks/", current: "/talks/", body: talksBody }));

  const urls = ["/", "/blog/", "/about/", "/talks/", ...posts.map((post) => `/blog/${post.slug}/`)];
  await writeFile(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeXml(absoluteUrl(url))}</loc></url>`).join("")}</urlset>\n`, "utf8");
  await writeFile(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`, "utf8");
  await writeFile(path.join(DIST, "llms.txt"), `# ${SITE_NAME}\n\nPersonal software engineering blog by nemo1st.\n\n${posts.map((post) => `- ${post.title}: ${absoluteUrl(`/blog/${post.slug}/`)}`).join("\n")}\n`, "utf8");
  await writeFile(path.join(DIST, "rss.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${SITE_NAME}</title><link>${SITE_URL}</link><description>Software engineering notes</description>${posts.map((post) => `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(absoluteUrl(`/blog/${post.slug}/`))}</link><guid>${escapeXml(absoluteUrl(`/blog/${post.slug}/`))}</guid><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><description>${escapeXml(post.description)}</description></item>`).join("")}</channel></rss>\n`, "utf8");
  const notFound = `<main id="main"><section class="not-found"><p class="eyebrow">404</p><h1>ページが見つかりません</h1><a class="button" href="${sitePath("/")}">トップへ戻る</a></section></main>`;
  await writePage("404.html", layout({ title: "404", description: "ページが見つかりません。", pathname: "/404.html", body: notFound }));
  console.log(`Built ${posts.length} article(s) into dist/`);
}

await build();
