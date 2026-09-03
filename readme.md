# Wa-Editorial (和エディトリアル) — Design System

## Production site workflow

The production site is generated from Markdown. Article sources live in `content/blog/*.md`; the
generated site is written to `dist/` and is intentionally not committed.

```sh
# Generate the complete static site
npm run build

# Generate and serve it locally, rebuilding when content changes
npm run dev
```

To add an article, copy `content/blog/_template.md`, rename it to the desired URL slug, edit the Front
Matter and body, then set `draft: false`. Pushing to the `main` branch runs
`.github/workflows/deploy-pages.yml`, which builds and deploys `dist/` to GitHub Pages. In the repository
settings, select **GitHub Actions** as the Pages source. The build emits `CNAME` for `nemo1st.dev`; DNS
still needs to point the domain at GitHub Pages before the custom domain becomes live.

The GitHub Pages workflow currently publishes at `https://nemo1st.github.io/nemo1st.dev/` with
`BASE_PATH=/nemo1st.dev`. After the custom-domain DNS is configured, change `SITE_URL` to
`https://nemo1st.dev`, remove `BASE_PATH`, and set `CUSTOM_DOMAIN=nemo1st.dev` in the workflow.

The generator is dependency-free and lives in `scripts/build.mjs`. It also creates article metadata,
Open Graph/Twitter metadata, RSS, `sitemap.xml`, `robots.txt`, and a 404 page.

A design system for an **approachable personal engineering site**: a developer blog with a
self-introduction, a talks archive and short-form notes. It is built for **nemo1st.dev**,
and its visual foundations are taken from the design system published in the reference site
the user pointed at.

## Sources

Everything in this project was read from real source code, not screenshots:

- Reference site: <https://azukiazusa.dev/about/> (`azukiazusa` のテックブログ2) — the brief was
  "こんな感じでとっつきやすいエンジニアの自己紹介サイトを作りたい / nemo1st.dev".
- Source repository (MIT): <https://github.com/azukiazusa1/sapper-blog-app> — SvelteKit + Tailwind v4 monorepo.
  - `DESIGN.md` — the reference site's own design-system document, named **和エディトリアル**. The single
    most important source; sections are cited throughout this readme.
  - `app/src/app.css` — `@theme` tokens, Japanese typography base layer, markdown/article styles.
  - `app/src/app.html` — Google Fonts loading.
  - `app/src/components/**` — the component inventory (Svelte).
  - `app/src/routes/**` — home, blog index, article, about, talks, tags.
  - `contents/writing-style.md` — the prose/tone analysis used for CONTENT FUNDAMENTALS below.
- Target brand: **nemo1st.dev** (the user's own domain). Do not assume the reader has access to any of the above.

### Brand identity — no logo

The reference site ships **no logo mark**: its identity is the bare domain set in JetBrains Mono
(`app/src/components/Header/Title.svelte`). No mark was provided for nemo1st.dev either, so this system
deliberately contains **no logo file**. Wherever a mark would go, render the domain in mono type — see
`components/navigation/SiteTitle.jsx` and the "Wordmark" card. No logo was drawn or reconstructed.

## Design philosophy

Five principles, ported verbatim from `DESIGN.md` §1:

1. **間 (Ma)** — generous whitespace; remove visual noise.
2. **Flat & honest** — never fake depth with gradients. A background is its own colour.
3. **Typography-driven** — type carries the personality, not ornament.
4. **Restrained colour** — one accent, used sparingly, expressed as a **line** rather than a fill.
5. **Sharp geometry** — no pills. Radii live between 2 and 8px.

---

## CONTENT FUNDAMENTALS

**Language.** Japanese first, English second. The site is bilingual (`ja` / `en` toggle in the header),
but Japanese is the authored language and English pages are marked as AI-translated with an amber
`role="note"` banner. UI chrome is written in **English** even on Japanese pages: nav labels are the raw
route names (`blog`, `about`, `talks`, `recap`), section labels are `LATEST ARTICLES`, `SHORTS`,
`NAVIGATE`, `Feature`. Body copy, article titles, quiz text and button labels are Japanese.

**Voice.** ですます調 throughout — polite, never casual-abrupt and never keigo-stiff. First person is
「私」. Objective when explaining, subjective when reflecting: 「〜と思います」「〜と感じました」appear in
intros and conclusions, not in the technical middle. The reader is addressed inclusively:
「〜を見ていきましょう」, not 「〜してください」.

**Sentence endings** are varied deliberately: 「〜です／ます」as the base, then 「〜でしょう」(inference),
「〜かもしれません」(hedge), 「〜する必要があります」(requirement), 「〜べきです」(recommendation).

**Article shape.** 導入 (「この記事では〜」) → 本文 in `##`/`###` sections → まとめ → 参考文献 as a link list.

**Casing.** UI labels are lowercase (`blog`, `about`) or ALL-CAPS with 0.2em tracking (section labels).
Sentence case for English prose. Tags are always prefixed with a literal `#`.

**Emoji.** Used *once*, on purpose: the waving hand 👋 in the home hero. That single emoji is the whole
approachability budget — do not add emoji to cards, alerts, headings or lists.

**Metadata voice.** Dates are mono and dotted: `2026.03.01` (ja) / `Mar 1, 2026` (en). The about page
writes personal facts as a mono key/value list — `frontend / expert`, `blogging / weekly`,
`mahjong / enabled` — a config-file joke that is the site's main note of personality.

**Copy examples (verbatim from source):**
- `Hey, I'm azukiazusa👋` — the hero pattern (`Hey, I'm {name}👋`).
- `© 2026 - Copyright azukiazusa, All Rights Reserved.`
- `This article was translated from Japanese by AI and may contain inaccuracies.`
- `理解度チェック` / `正解` / `もう一度考えてみましょう`
- `もっと見る`, `Back to blog`, `→ blog`, `→ talks`

---

## VISUAL FOUNDATIONS

**Colour.** Two families and nothing else. `stone` is the *only* grey ramp — `slate`, `gray`, `zinc`,
`neutral`, `lime`, `teal`, `sky` and `fuchsia` are switched off in the source's `@theme` block and
flagged by ESLint. One accent hue at 244° (steel blue) with two lightness stops:
`oklch(50% 0.070 244)` for light mode, `oklch(78% 0.110 244)` for dark. The hue is sampled from the brand
icon's flat background, `#39617a`, kept as `--brand-ink`. (The reference site used the same recipe at
182°, teal; only the hue moved.) Accent is used as **text,
labels and borders**; the only permitted accent *fill* is a primary button (and the FAB). Tints are
always derived with `color-mix(in oklch, var(--color-accent) 8–10%, transparent)`, never hand-picked.
Red / green / yellow / blue exist only inside article alert callouts. A second background colour —
`stone-900` — is used for the dark page banner on Blog and Talks; that is the whole palette.

**Dark mode** is first-class, driven by a `.dark` class on `<html>` with a `system` option that follows
`prefers-color-scheme`. Every token has a dark counterpart. Never ship light-only.

**Type.** Three roles. Headings and hero use **Bricolage Grotesque** (600/800, variable optical size).
Wordmark, dates, tags, section labels and code use **JetBrains Mono** (400/500). Body copy uses **no
webfont at all** — `--font-sans` is the generic `sans-serif`, with no family names enumerated, so each OS
picks its own (Hiragino Kaku Gothic ProN on Apple, Noto Sans JP on Windows/Android) and user-set fonts such
as dyslexia-friendly faces survive. `system-ui` is
**forbidden**: on Japanese Windows it resolves to Yu Gothic UI.

Japanese typography is tuned properly: `text-autospace: normal`, `text-spacing-trim: trim-start`,
`line-break: strict`, `overflow-wrap: anywhere`. Headings get `font-feature-settings: "palt"`,
`word-break: auto-phrase` and `text-wrap: balance`; **body copy gets none of these** (ベタ組み — applying
them wrecks paragraph rhythm). Article body is 1rem/1.9 rising to 1.0625rem/2.0 with 0.01em tracking
above 768px, capped at a 756px measure. Sizes are in `rem` and breakpoints in `em` so browser text
zoom never breaks layout.

**Section headings** are not big and bold. They are mono, uppercase, 0.2em tracking, stone-500, with a
1px bottom rule and 2rem of space beneath.

**Backgrounds.** Flat colour only. No hero photography, no full-bleed imagery, no repeating pattern, no
texture, no noise, no gradient background. The one exception in the entire system: the home hero carries
a single soft blurred accent orb (`radial-gradient` + `blur(10px)`, 0.7 opacity) and the hero name is
filled with a 135° accent gradient via `background-clip: text`. Those two effects are hero-only; do not
reuse them.

**Imagery.** Article thumbnails are illustrative and are rendered `object-fit: contain` at a fixed
height (18rem on the article page) rather than cropped — they are drawings and diagrams, not
photography, so nothing is cut off. Card thumbnails do use `object-fit: cover` in a 4:3 box. No colour
grading, no duotone, no grain filter; images appear as authored. Avatars are round and 24/32/96px.
Images inside articles are click-to-zoom into a blurred-scrim dialog.

**Depth & shadows.** Depth is a **border**, not a shadow: 1px `stone-200`/`stone-800`, radius 8px, flat
`white`/`stone-900` fill. Shadows are reserved for three things that physically float — the FAB, the
modal/dialog, and the dropdown. A card with `shadow` + `hover:shadow-xl` is a defect.

**Corner radii.** `--radius` 4px for buttons, tags, badges, inputs, nav items. `--radius-lg` 8px for
cards, panels, dialogs, pagination cells. `--radius-full` **only** for avatars and small decorative dots
(timeline nodes, typing indicators). No pills, nothing above 8px.

**Borders.** Hairline 1px everywhere. 2px appears in exactly two places: the search bar and the theme
dropdown. 4px left borders mark blockquotes and alerts. The TOC rail is a 2px left border, and the
active TOC item overlays a 2px accent left border.

**Transparency & blur.** Glassmorphism is banned. `backdrop-filter` is allowed only on functional
overlays — the search dialog scrim and the image-zoom scrim (`bg-black/80` + `blur(2px)`). The sticky
header is a solid `stone-50`/`stone-950` fill with a hairline bottom border, never translucent. No
protection gradients; a dark banner uses a solid stone-900 fill instead.

**Hover states.** Surfaces move to `--surface-hover` (stone-100 / stone-800). Links underline. Primary
buttons drop to 80% opacity. Article-body links carry a *dotted* accent underline that becomes *solid*
on hover, plus 0.75 opacity. Card titles gain an accent-coloured underline. What never happens: no
translate-y lift, no image `scale`, no shadow growth, no colour inversion.

**Press / focus / active.** `focus-visible` is always at least as loud as hover — a 2px accent outline
with 2px offset, or a border change; `outline: none` without a replacement is a defect. Current location
uses `aria-current="page"` plus **two** visual signals (background tint *and* accent text) — state is
never colour alone. Active pagination and active tabs *invert* (stone-800 fill, white text) rather than
going accent. Disabled means 0.5 opacity **and** `pointer-events: none`, not opacity alone.

**Motion.** Functional only. `transition-colors` at 200ms ease-out for hovers; 300ms ease-in-out for the
drawer and modals; the View Transitions API for page navigation. `transition-all` is banned. Decorative
pulses are banned. The one flourish is the hero's hand wave, which plays **once**. All non-essential
motion is disabled under `prefers-reduced-motion`.

**Layout.** Container is centred with a 1rem gutter. Max widths: 1280px home/lists, 1152px article,
1024px meta pages, 756px prose measure, 600px shorts thread, 240px TOC rail. Cards sit on `gap: 1.5rem`
(2rem in the post grid); sections are 4rem apart; card padding is 1.25rem (cards) to 2rem (panels).
Fixed/sticky elements: the header (hides on scroll-down, returns on scroll-up, `z-index: 40`), the
desktop TOC rail (`position: sticky; top: 5rem`), the about-page profile sidebar (`top: 6rem`), and the
FAB. Interactive targets are ≥44×44px, and `scroll-margin-top: 5rem` keeps anchors clear of the header.

**Responsive / SP.** Breakpoints are md 768 and lg 1024, matching the source. Because components style
inline, the system splits responsiveness in two: **sizing** is CSS-only — `clamp()` for display type,
section gaps and page padding, `repeat(auto-fit, minmax(min(100%, 17.5rem), 1fr))` for card grids — while
**structural** changes read `useMinWidth` from `components/core/breakpoints.jsx`. Use the hook only when
the DOM order or arrangement genuinely changes (header contents, a card flipping from row to column, the
TOC moving out of its rail); reach for `clamp()` first. Below lg the nav collapses into the drawer and
side rails move inline; below md search becomes an icon, the Feature card stacks, and the talks timeline
moves its dates from the left gutter into each card.

**Layer scale.** Base `auto`/0 · Raised 10 · Sticky 40 · Overlay 50 · Dialog 60 · Ephemeral 70. Name the
layer; never invent `z-[9999]`.

---

## ICONOGRAPHY

The reference site has **no icon font and no sprite sheet**. Icons are hand-inlined `<svg>` elements,
one per Svelte component in `app/src/components/Icons/`. Their paths are **Heroicons** outline glyphs
(24×24 viewBox, `stroke-width` 1.5, occasionally 2 or 3 for check marks), plus a few Heroicons *solid*
20×20 glyphs (menu, moon, arrow-right), two **Font Awesome Free** solid marks (robot for `llms.txt`,
clipboard for code copy) and two brand marks (GitHub, X). Everything is `fill="currentColor"` or
`stroke="currentColor"`, so icons inherit text colour and dark mode for free.

Those exact paths were extracted from the source and written to **`assets/icons/*.svg`** (32 files) —
nothing was drawn by hand and nothing was substituted. Use them through
`components/core/Icon.jsx`, which masks the file with `currentColor`:

```jsx
<Icon name="rss" size={20} base="../../assets/icons" title="RSS" />
```

Conventions:
- Default size 20px; 16px inline with small text; 24px in article headers and timeline links.
- Icon-only buttons **require** `aria-label`; decorative icons beside a label are `aria-hidden`.
- Unicode characters do real work in this brand: `#` prefixes tags and is generated for heading anchors
  (`##`, `###` …), `→` prefixes the about page's nav buttons, `>` separates breadcrumbs, and `⌘`/`K`
  render as `<kbd>` in the search bar.
- Emoji is not an icon system here — see CONTENT FUNDAMENTALS (👋 only).

---

## Component inventory

Built from the families the source defines (`app/src/components/**`). The `recap/2023–2025` routes are
explicitly out of scope in `DESIGN.md` §12 (standalone yearly pages with their own themes) and were not
ported.

**`components/core/`** — LinkButton, Link, Badge, Tag (chip + count-card), Panel, Avatar, Time,
SectionHeading, Icon
**`components/navigation/`** — SiteHeader, Nav, SiteTitle, SideMenu, Breadcrumb, Pagination,
TableOfContents, Tabs
**`components/content/`** — PostCard, PostList, FeaturedPostCard, HeroSection, PageBanner, Timeline
(+TimelineItem), ShortItem (+ShortList), Alert, ArticleHeader, ArticleBody, SiteFooter, DraftTable
**`components/interactive/`** — SearchBar, SearchDialog, ThemeToggle, MarkdownCopyButton,
FloatingActionButton, QuizQuestion, Contributors

### Intentional additions

| Component | Why |
| --- | --- |
| `Icon` | The source has 17 one-off icon components; a single wrapper over `assets/icons` replaces them. |
| `SectionHeading` | `DESIGN.md` §3 defines the editorial label as a pattern, repeated inline in every route. Componentised so it stays consistent. |
| `Panel` | `DESIGN.md` §9 "Card / Panel" is a documented markup pattern with no component file. (The source's `Card.svelte` is the *article* layout, ported as `ArticleHeader` + `ArticleBody`.) |
| `PageBanner` | The dark title band is duplicated inline in `blog/Tabs.svelte` and `talks/+page.svelte`. |
| `FeaturedPostCard` | The home page's wide "Feature" card is written inline in `routes/+page.svelte`. |
| `ArticleBody` | Carries the `#contents` prose measurements as a component instead of a global selector. |

### Not ported

`GoogleAnalytics`, `Ogp`, `PreferredSourceButton`, `CopyLinkButton`, `ShareButton`,
`TwitterShareButton`, `HatenaShareButton`, `GitHubEditButton`, `Image` (a Contentful `srcset` helper),
`ParticleBackground` (used only by an out-of-scope recap page) — these are integration plumbing or
one-off share widgets rather than visual primitives. Ask if you want them.

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | Global entry point — `@import` list only. Consumers link this one file. |
| `tokens/fonts.css` | Google Fonts import (Bricolage Grotesque, JetBrains Mono). |
| `tokens/colors.css` | Stone ramp, accent, semantic surface/text/border aliases, alert palettes, `.dark` overrides. |
| `tokens/typography.css` | Families, size ramp, article measurements, weights, label tracking. |
| `tokens/spacing.css` | Spacing scale, rhythm rules, container widths, radii, target size, breakpoints. |
| `tokens/elevation.css` | The three permitted shadows, the z-index layer scale, motion durations. |
| `tokens/base.css` | Japanese typography base layer, body/link defaults, reduced-motion guard. |
| `assets/icons/` | 32 SVGs extracted from the source. No logo file — see "Brand identity". |
| `guidelines/*.card.html` | 20 foundation specimen cards (Colors, Type, Spacing, Brand). |
| `components/<group>/` | React primitives — `.jsx` + `.d.ts` + `.prompt.md`, one `@dsCard` per group. |
| `ui_kits/blog/` | Click-through recreation of the site — home, blog index, article, about, talks. Entry: `index.html`. |
| `thumbnail.html` | Homepage tile. |
| `SKILL.md` | Agent Skills front-matter wrapper for use outside this project. |

## Known gaps

- **Fonts are CDN-loaded.** The source repo ships no font binaries, so `tokens/fonts.css` imports
  Bricolage Grotesque and JetBrains Mono from Google Fonts. If you have licensed local copies, drop them
  in `assets/fonts/` and swap the import for `@font-face` rules. Body copy intentionally has no webfont and
  no enumerated family names — that is a deliberate rule from `DESIGN.md` §3, not an omission.
- **Avatar** is the user-supplied brand icon at `assets/avatar.jpeg` (400×400). Post thumbnails are flat
  grey placeholders in `assets/placeholders/` — supply real images to replace them.
- **Icon markup is inlined** into `components/core/Icon.jsx` from `assets/icons/*.svg`. A `mask-image`
  approach renders as a solid block in DOM-to-image captures and PDF export, so the SVG source is
  embedded instead. `assets/icons/` remains the source of truth — regenerate the map if you add a glyph.
- **No logo.** See "Brand identity" above.
