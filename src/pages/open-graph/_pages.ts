import { getCollection } from 'astro:content';
import locales from '../../../locales.json';
import {
  basePath,
  corePageSlug,
  corePrereleasesSlug,
  repositories,
} from '../../../packages/releases-site/generator/config';

/**
 * Every page that gets its own Open Graph card, docs and releases alike.
 *
 * Shared by the image endpoint (`[...path].ts`) and the route middleware
 * (`src/routeData.ts`) so the two can't disagree about which pages have a card.
 */

export interface OgCard {
  /** Card path under `/open-graph/`, without the `.webp` suffix. */
  slug: string;
  title: string;
  description: string;
}

/**
 * `full` renders every entry, `sample` only the English ones (enough to eyeball the design on
 * a deploy preview without paying for the whole set), `off` skips generation entirely.
 *
 * Keyed off `CONTEXT` rather than `CI`, because Netlify sets `CI=true` in every context — the
 * same trap documented for `TAURI_DOCS_SKIP_IMAGE_OPT` in `astro.config.mjs`.
 */
const ogMode = process.env.OG_MODE ?? (process.env.CONTEXT === 'production' ? 'full' : 'sample');

// `root` is English, which never appears in a URL; the rest prefix their pages' ids
const translatedDirs = new Set(Object.keys(locales).filter((code) => code !== 'root'));
const isTranslated = (id: string) => translatedDirs.has(id.split('/')[0]);

const docsEntries =
  ogMode === 'off'
    ? []
    : await getCollection(
        'docs',
        ({ id, data }) =>
          // Starlight drops drafts from production builds; match it so we don't render
          // cards for pages that never get built.
          (import.meta.env.MODE !== 'production' || data.draft === false) &&
          (ogMode === 'full' || !isTranslated(id))
      );

/**
 * Starlight normalizes the collection id of the root `index` page to an empty string
 * (`normalizeIndexSlug` in its routing utils) and exposes that as `entry.id`. Both spellings
 * reach this function: the raw `'index'` from the collection below, and the normalized `''`
 * from the middleware.
 */
export const docsCardSlug = (id: string) => (id === 'index' || id === '' ? 'index' : id);

const docsCards: OgCard[] = docsEntries.map(({ id, data }) => ({
  slug: docsCardSlug(id),
  title: data.title,
  // Blog posts carry an `excerpt` (starlight-blog schema) rather than a `description`.
  description: data.excerpt ?? data.description ?? '',
}));

/**
 * Release pages get one card per package rather than one per version.
 *
 * The release section builds ~2,840 pages, one per package version, and a card per version
 * would say almost nothing a card per package doesn't while dominating the build. So each
 * package gets a card and every version page under it shares that card.
 *
 * Cards mirror the URLs they serve, so they sit under the release base path. Two package names
 * contain a slash (`@tauri-apps/api`, `@tauri-apps/cli`), which nests those cards a directory
 * deeper, the same way their pages nest.
 */
const releaseCardDir = basePath.replace(/^\//, '');

/**
 * Page slugs that earn a card, in card order. `index.mdx` slugs itself to `''`.
 *
 * Each is looked up in the `releases` collection rather than assumed, so a build with no
 * generated release pages carries only the hand-written entries and the packages drop out on
 * their own — no card ends up pointing at a route that was never built. The filesystem probe
 * `astro.config.mjs` gates the route on is deliberately unavailable here; see
 * `src/release-pages.node.mjs`.
 */
const releasePageSlugs = [
  '',
  'table',
  corePageSlug,
  corePrereleasesSlug,
  ...repositories.flatMap((repo) => repo.packages).map((pkg) => pkg.name),
];

/** Title and description come from each page's own frontmatter, so a card cannot drift from it. */
const releaseEntries = new Map(
  (ogMode === 'off' ? [] : await getCollection('releases')).map((entry) => [
    entry.data.slug,
    entry.data,
  ])
);

const releaseCardSlugFor = (pageSlug: string) =>
  `${releaseCardDir}/${pageSlug === '' ? 'index' : pageSlug}`;

const releaseCards: OgCard[] = releasePageSlugs.flatMap((pageSlug) => {
  const data = releaseEntries.get(pageSlug);
  if (!data) return [];
  return [
    { slug: releaseCardSlugFor(pageSlug), title: data.title, description: data.description ?? '' },
  ];
});

/**
 * `OG_LIMIT=n` renders only the first n docs cards and the first n release cards. Purely a
 * development affordance, because a full run is ~250 images and a couple of minutes, which is
 * too slow to iterate against.
 *
 * Per group, not across both: the docs cards outnumber the release ones by four to one, so a
 * single budget spent in listing order would mean any limit small enough to be quick renders
 * no release cards at all — precisely the ones worth iterating on when they change.
 */
const limit = Number(process.env.OG_LIMIT ?? Infinity);
const all = [...docsCards.slice(0, limit), ...releaseCards.slice(0, limit)];

export const ogPages: Record<string, OgCard> = Object.fromEntries(
  all.map((card) => [card.slug, card])
);

/** Filename of a card, without the `/open-graph/` prefix. */
export const ogImageSlug = (slug: string) => `${slug}.webp`;

/** Path of a card relative to the site root. */
export const ogImagePath = (slug: string) => `/open-graph/${ogImageSlug(slug)}`;

export const hasCard = (slug: string) => Object.hasOwn(ogPages, slug);

/**
 * Longest-prefix match of a release pathname to its card.
 *
 * Longest first, so `core/prereleases` wins over `core` and a package name containing a slash
 * is not shadowed by a shorter one sharing its first segment. Matches on the URL rather than
 * the route entry because the release route hands `<StarlightPage>` a synthesised entry that
 * does not carry the slug the page was generated from.
 */
const byLength = releasePageSlugs
  .filter((pageSlug) => pageSlug !== '')
  .sort((a, b) => b.length - a.length);

export function releaseCardSlug(pathname: string): string | undefined {
  const path = pathname.slice(basePath.length).replace(/^\/|\/$/g, '');
  if (path === '' || path === 'index') return releaseCardSlugFor('');

  const match = byLength.find((pageSlug) => path === pageSlug || path.startsWith(pageSlug + '/'));
  return match === undefined ? undefined : releaseCardSlugFor(match);
}
