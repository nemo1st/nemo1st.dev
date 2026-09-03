import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const escapeXml = escapeHtml;

function parseScalar(raw) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map((item) => parseScalar(item)).filter(Boolean);
  }
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
    if (pair) {
      currentKey = pair[1];
      meta[currentKey] = pair[2] ? parseScalar(pair[2]) : [];
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && currentKey && Array.isArray(meta[currentKey])) meta[currentKey].push(parseScalar(item[1]));
  }

  const body = normalized.slice(end + 5).trim();
  const slug = path.basename(filename, path.extname(filename));
  const required = ["title", "date", "description"];
  for (const key of required) {
    if (!meta[key]) throw new Error(`${filename}: ${key} を指定してください。`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(meta.date))) throw new Error(`${filename}: date は YYYY-MM-DD 形式にしてください。`);
  if (!Array.isArray(meta.tags)) meta.tags = meta.tags ? [meta.tags] : [];
  return { ...meta, slug, body, source: filename, draft: meta.draft === true };
}

function safeHref(value) {
  const href = String(value).trim();
  return /^(https?:\/\/|\/|#)/.test(href) ? href : "#";
}

function sitePath(pathname) {
  if (!pathname.startsWith("/")) return pathname;
  return `${BASE_PATH}${pathname}` || "/";
}

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
  const base = String(text).normalize("NFKC").toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || `section-${index}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  const toc = [];
  const usedIds = new Set();
  let index = 0;

  const isBlockStart = (line) => /^(#{2,4})\s+|^```|^>\s?|^[-*]\s+|^\d+\.\s+|^!\[[^\]]*\]\([^)]+\)$/.test(line);

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(`<div class="code-block">${language ? `<div class="code-label">${escapeHtml(language)}</div>` : ""}<pre><code>${escapeHtml(code.join("\n"))}</code></pre></div>`);
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const id = makeHeadingId(heading[2], index, usedIds);
      toc.push({ level, id, text: heading[2] });
      blocks.push(`<h${level} id="${escapeHtml(id)}">${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      const src = safeHref(image[2]);
      blocks.push(`<figure><img src="${escapeHtml(src.startsWith("/") ? sitePath(src) : src)}" alt="${escapeHtml(image[1])}" loading="lazy"><figcaption>${escapeHtml(image[1])}</figcaption></figure>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ""));
      blocks.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`);
      continue;
    }

    const unordered = /^[-*]\s+/.test(line);
    const ordered = /^\d+\.\s+/.test(line);
    if (unordered || ordered) {
      const matcher = unordered ? /^[-*]\s+/ : /^\d+\.\s+/;
      const items = [];
      while (index < lines.length && matcher.test(lines[index])) items.push(lines[index++].replace(matcher, ""));
      const tag = ordered ? "ol" : "ul";
      blocks.push(`<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }
  return { html: blocks.join("\n"), toc };
}

function formatDate(value) {
  return String(value).replaceAll("-", ".");
}

function absoluteUrl(pathname) {
  return `${SITE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function navLink(href, label, current) {
  return `<a href="${sitePath(href)}"${current === href ? ' aria-current="page"' : ""}>${label}</a>`;
}

function layout({ title, description, pathname, current = "", body, type = "website", date, jsonLd }) {
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;
  const canonical = absoluteUrl(pathname);
  const ogImage = absoluteUrl("/og.png");
  return `<!doctype html>
<html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}"><link rel="stylesheet" href="${sitePath("/styles.css")}"><link rel="stylesheet" href="${sitePath("/site.css")}">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${SITE_NAME}"><meta property="og:title" content="${escapeHtml(fullTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${ogImage}">
${date ? `<meta property="article:published_time" content="${escapeHtml(date)}">` : ""}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(fullTitle)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${ogImage}">
<script>try{const t=localStorage.getItem("nemo-theme")||"system";document.documentElement.classList.toggle("dark",t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))}catch{}</script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script>` : ""}</head>
<body><a class="skip-link" href="#main">本文へ移動</a>
<header class="site-header"><div class="header-inner"><a class="wordmark" href="${sitePath("/")}">${SITE_NAME}</a><button class="menu-toggle" type="button" data-menu-toggle aria-label="メニューを開く" aria-expanded="false">menu</button><nav class="site-nav" data-site-nav aria-label="メインナビゲーション">${navLink("/blog/", "blog", current)}${navLink("/about/", "about", current)}<a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">github</a></nav><div class="nav-actions"><button class="theme-toggle" type="button" data-theme-toggle aria-label="テーマを切り替える">system</button></div></div></header>
${body}
<footer class="site-footer"><div class="container footer-inner"><span>© ${new Date().getFullYear()} nemo1st</span><span>Built from Markdown on GitHub.</span></div></footer>
<script src="${sitePath("/site.js")}" defer></script></body></html>`;
}

function tagsHtml(tags) {
  return `<div class="tags">${tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function postCard(post) {
  return `<article class="post-card"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time><h2><a href="${sitePath(`/blog/${encodeURIComponent(post.slug)}/`)}">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.description)}</p>${tagsHtml(post.tags)}</article>`;
}

async function writePage(relative, html) {
  const target = path.join(DIST, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

async function copyStaticAssets() {
  await cp(path.join(ROOT, "tokens"), path.join(DIST, "tokens"), { recursive: true });
  await cp(path.join(ROOT, "assets"), path.join(DIST, "assets"), { recursive: true });
  await cp(path.join(ROOT, "site", "public"), DIST, { recursive: true });
  await cp(path.join(ROOT, "styles.css"), path.join(DIST, "styles.css"));
  await cp(path.join(ROOT, "site", "site.css"), path.join(DIST, "site.css"));
  await cp(path.join(ROOT, "site", "site.js"), path.join(DIST, "site.js"));
  if (CUSTOM_DOMAIN) await writeFile(path.join(DIST, "CNAME"), `${CUSTOM_DOMAIN}\n`, "utf8");
}

async function loadPosts() {
  const files = (await readdir(CONTENT)).filter((file) => file.endsWith(".md")).sort();
  const posts = [];
  for (const file of files) {
    const source = await readFile(path.join(CONTENT, file), "utf8");
    const post = parseDocument(source, file);
    if (!post.draft) posts.push(post);
  }
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const duplicates = posts.filter((post, index) => posts.findIndex((candidate) => candidate.slug === post.slug) !== index);
  if (duplicates.length) throw new Error(`記事スラッグが重複しています: ${duplicates.map((post) => post.slug).join(", ")}`);
  return posts;
}

async function build() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await copyStaticAssets();
  const posts = await loadPosts();

  const latest = posts.slice(0, 4);
  const homeBody = `<main id="main"><section class="hero"><div class="container hero-grid"><div><p class="eyebrow">Software Engineer</p><h1>Hey, I’m nemo1st.</h1><p class="hero-copy">Web開発から低レイヤー、データ構造解析、開発自動化まで。仕組みを深掘りしてハックするのが好きです。</p><div class="hero-actions"><a class="button button-primary" href="${sitePath("/blog/")}">Read the blog</a><a class="button" href="${sitePath("/about/")}">About me</a></div></div><img class="hero-avatar" src="${sitePath("/assets/avatar.jpeg")}" alt="nemo1stのアバター" width="400" height="400"></div></section><section class="section"><div class="container"><div class="section-heading"><h2>Latest articles</h2><a href="${sitePath("/blog/")}">すべて見る →</a></div>${latest.length ? `<div class="post-grid">${latest.map(postCard).join("")}</div>` : '<div class="empty">公開済みの記事はまだありません。</div>'}</div></section></main>`;
  await writePage("index.html", layout({ title: SITE_NAME, description: "nemo1stのソフトウェアエンジニアリングノート。", pathname: "/", body: homeBody }));

  const blogBody = `<main id="main"><section class="page-banner"><div class="container"><h1>Blog</h1><p>読んだ仕様と、手を動かした記録を置いています。</p></div></section><section class="section"><div class="container">${posts.length ? `<div class="post-grid">${posts.map(postCard).join("")}</div>` : '<div class="empty">公開済みの記事はまだありません。</div>'}</div></section></main>`;
  await writePage("blog/index.html", layout({ title: "Blog", description: "nemo1stの技術記事一覧。", pathname: "/blog/", current: "/blog/", body: blogBody }));

  for (const post of posts) {
    const rendered = renderMarkdown(post.body);
    const toc = rendered.toc.length ? `<aside class="toc" aria-label="目次"><p>Contents</p>${rendered.toc.map((item) => `<a href="#${escapeHtml(item.id)}"${item.level > 2 ? ' style="padding-left:1rem"' : ""}>${escapeHtml(item.text)}</a>`).join("")}</aside>` : "";
    const articleBody = `<main id="main"><header class="article-header"><div class="prose-container"><div class="breadcrumb"><a href="${sitePath("/blog/")}">blog</a> &gt; article</div><time class="article-date" datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time><h1>${escapeHtml(post.title)}</h1><p class="article-description">${escapeHtml(post.description)}</p>${tagsHtml(post.tags)}</div></header><div class="article-layout"><article class="article-body">${rendered.html}</article>${toc}</div></main>`;
    const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, datePublished: post.date, author: { "@type": "Person", name: "nemo1st", url: GITHUB_URL }, mainEntityOfPage: absoluteUrl(`/blog/${post.slug}/`) };
    await writePage(`blog/${post.slug}/index.html`, layout({ title: post.title, description: post.description, pathname: `/blog/${post.slug}/`, current: "/blog/", body: articleBody, type: "article", date: post.date, jsonLd }));
  }

  const aboutBody = `<main id="main"><section class="section"><div class="container about-grid"><img class="about-avatar" src="${sitePath("/assets/avatar.jpeg")}" alt="nemo1stのアバター" width="400" height="400"><div class="about-copy"><p class="eyebrow">About</p><h1>nemo1st</h1><p>仕組みを深掘りしてハックするのが好きなソフトウェアエンジニアです。Web開発、低レイヤー、データ構造解析、開発自動化について記録しています。</p><p><a class="button" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">GitHubを見る →</a></p></div></div></section></main>`;
  await writePage("about/index.html", layout({ title: "About", description: "nemo1stについて。", pathname: "/about/", current: "/about/", body: aboutBody }));

  const urls = ["/", "/blog/", "/about/", ...posts.map((post) => `/blog/${post.slug}/`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeXml(absoluteUrl(url))}</loc></url>`).join("")}</urlset>\n`;
  await writeFile(path.join(DIST, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`, "utf8");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${SITE_NAME}</title><link>${SITE_URL}</link><description>Software engineering notes</description>${posts.map((post) => `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(absoluteUrl(`/blog/${post.slug}/`))}</link><guid>${escapeXml(absoluteUrl(`/blog/${post.slug}/`))}</guid><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><description>${escapeXml(post.description)}</description></item>`).join("")}</channel></rss>\n`;
  await writeFile(path.join(DIST, "rss.xml"), rss, "utf8");

  const notFound = `<main id="main"><section class="section"><div class="prose-container"><p class="eyebrow">404</p><h1>ページが見つかりません</h1><p><a href="${sitePath("/")}">トップへ戻る</a></p></div></section></main>`;
  await writePage("404.html", layout({ title: "404", description: "ページが見つかりません。", pathname: "/404.html", body: notFound }));
  console.log(`Built ${posts.length} article(s) into dist/`);
}

await build();
