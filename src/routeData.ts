import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { markCurrentByPrefix } from './components/releases/sidebar-current.ts';
import { ogTags } from './og/tags';
import { docsCardSlug, ogCardSlugs, ogImagePath, releaseCardSlug } from './pages/open-graph/_pages';
import { isReleasePage } from './release-config.mjs';

/**
 * Point each page at its own Open Graph card, falling back to the site-wide `/og.png`.
 *
 * Docs pages look up by `entry.id` rather than the route id: on a page showing fallback content
 * for an untranslated locale, `entry` is the English entry, so `/de/plugin/fs/` reuses the card
 * generated for `plugin/fs` instead of asking for one that was never built. Release pages match
 * on the URL instead, because the injected `/release/[...slug]` route hands `<StarlightPage>` a
 * synthesised entry that does not carry the slug we generate pages from.
 *
 * Routes with no card — blog tag and author listings, 404, and every page when `OG_MODE` limits
 * generation — get `/og.png`.
 */
function cardPath(context: Parameters<Parameters<typeof defineRouteMiddleware>[0]>[0]): string {
  const slug = isReleasePage(context.url.pathname)
    ? releaseCardSlug(context.url.pathname)
    : docsCardSlug(context.locals.starlightRoute.entry?.id ?? '');

  return slug && ogCardSlugs.has(slug) ? ogImagePath(slug) : '/og.png?v=1';
}

export const onRequest = defineRouteMiddleware((context) => {
  // version pages are not sidebar entries — mark their package's entry instead
  if (isReleasePage(context.url.pathname)) {
    markCurrentByPrefix(context.locals.starlightRoute.sidebar, context.url.pathname);
  }

  context.locals.starlightRoute.head.push(...ogTags(new URL(cardPath(context), context.site)));
});
