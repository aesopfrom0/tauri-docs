import { getCollection } from 'astro:content';
import {
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
const mode = process.env.OG_MODE ?? (process.env.CONTEXT === 'production' ? 'full' : 'sample');

const localeDirs = ['fr', 'es', 'zh-cn', 'ja', 'ko', 'de', 'it'];
const isTranslated = (id: string) => localeDirs.includes(id.split('/')[0]);

const docsEntries =
  mode === 'off'
    ? []
    : await getCollection(
        'docs',
        ({ id, data }) =>
          // Starlight drops drafts from production builds; match it so we don't render
          // cards for pages that never get built.
          (import.meta.env.MODE !== 'production' || data.draft === false) &&
          (mode === 'full' || !isTranslated(id))
      );

/**
 * Starlight normalizes the collection id of the root `index` page to an empty string
 * (`normalizeIndexSlug` in its routing utils) and exposes that as `entry.id`. Key the cards the
 * same way so the middleware's lookup matches, and give the root card a usable filename.
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
 * Cards live under `release/` to mirror the URLs they serve. Two package names contain a
 * slash (`@tauri-apps/api`, `@tauri-apps/cli`), which nests those cards a directory deeper,
 * the same way their pages nest.
 *
 * Which packages have pages is read from the `releases` collection rather than probed on
 * disk. A build with no generated release pages carries only the two hand-written entries,
 * so the packages drop out on their own and no card points at a route that was never built.
 * Do not reach for `hasGeneratedReleasePages()` here: it resolves its path from
 * `import.meta.url`, which points somewhere else once Vite has processed the module, so it
 * answers correctly in `astro.config.mjs` and silently returns false in here.
 */
const releaseSlugs = new Set(
  (mode === 'off' ? [] : await getCollection('releases')).map((entry) => entry.data.slug)
);

const releasePackages = repositories
  .flatMap((repo) => repo.packages)
  .filter((pkg) => releaseSlugs.has(pkg.name))
  .map((pkg) => ({
    name: pkg.name,
    card: {
      slug: `release/${pkg.name}`,
      title: pkg.name,
      description: pkg.description ?? `Release notes for ${pkg.name}.`,
    } satisfies OgCard,
  }));

/**
 * Release pages that do not belong to a single package; `index.mdx` slugs itself to `''`.
 *
 * The two core pages are generated, so they only exist once the generator has run — the same
 * reason the package cards are gated on the collection.
 */
const releaseStandalone: { pageSlug: string; card: OgCard }[] = [
  {
    pageSlug: '',
    card: {
      slug: 'release/index',
      title: 'Tauri Releases',
      description: 'Release notes for the Tauri core ecosystem.',
    },
  },
  {
    pageSlug: 'table',
    card: {
      slug: 'release/table',
      title: 'Changelog Table',
      description: 'Every Tauri package version in one table.',
    },
  },
  {
    pageSlug: corePageSlug,
    card: {
      slug: `release/${corePageSlug}`,
      title: 'Tauri Core Releases',
      description:
        'Release notes for tauri, @tauri-apps/api, and the Tauri CLI, grouped by version.',
    },
  },
  {
    pageSlug: corePrereleasesSlug,
    card: {
      slug: `release/${corePrereleasesSlug}`,
      title: 'Tauri 2.0 Prereleases',
      description: 'The alpha, beta, and release candidate versions that led up to Tauri 2.0.',
    },
  },
].filter((entry) => releaseSlugs.has(entry.pageSlug));

const releaseCards: OgCard[] = [
  ...releaseStandalone.map((entry) => entry.card),
  ...releasePackages.map((p) => p.card),
];

/**
 * `OG_LIMIT=n` renders only the first n cards. Purely a development affordance, because a full
 * run is ~600 images and a couple of minutes, which is too slow to iterate against.
 */
const all = [...docsCards, ...releaseCards];
const limit = Number(process.env.OG_LIMIT ?? all.length);

export const ogPages: Record<string, OgCard> = Object.fromEntries(
  all.slice(0, limit).map((card) => [card.slug, card])
);

export const ogCardSlugs: ReadonlySet<string> = new Set(Object.keys(ogPages));

/** Filename of a card, without the `/open-graph/` prefix. */
export const ogImageSlug = (slug: string) => `${slug}.webp`;

/** Path of a card relative to the site root. */
export const ogImagePath = (slug: string) => `/open-graph/${ogImageSlug(slug)}`;

/**
 * Longest-prefix match of a `/release/` pathname to its package card.
 *
 * Longest-prefix rather than first-segment because two package names contain a slash, so the
 * first segment alone is ambiguous. Matches on the URL rather than the route entry because the
 * release route hands `<StarlightPage>` a synthesised entry that does not carry our own slug.
 */
const byLength = [
  ...releasePackages.map((p) => ({ prefix: p.name, slug: p.card.slug })),
  ...releaseStandalone
    .filter((entry) => entry.pageSlug !== '')
    .map((entry) => ({ prefix: entry.pageSlug, slug: entry.card.slug })),
].sort((a, b) => b.prefix.length - a.prefix.length);

export function releaseCardSlug(pathname: string): string | undefined {
  const path = pathname.replace(/^\/release\/?/, '').replace(/\/$/, '');
  if (path === '' || path === 'index') return 'release/index';

  // longest first, so `core/prereleases` wins over `core` and a package name containing a
  // slash is not shadowed by a shorter one sharing its first segment
  const match = byLength.find((p) => path === p.prefix || path.startsWith(p.prefix + '/'));
  return match?.slug;
}
