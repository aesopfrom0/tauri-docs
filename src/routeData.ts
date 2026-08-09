import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { markCurrentByPrefix } from './components/releases/sidebar-current.ts';
import { ogTags } from './og/tags';
import { docsCardSlug, hasCard, ogImagePath, releaseCardSlug } from './pages/open-graph/_pages';
import { isReleasePage } from './release-config.mjs';

/**
 * Point each page at its own Open Graph card, falling back to the site-wide `/og.png`.
 *
 * Docs pages look up by `entry.id` rather than the route id: on a page showing fallback content
 * for an untranslated locale, `entry` is the English entry, so `/de/plugin/fs/` reuses the card
 * generated for `plugin/fs` instead of asking for one that was never built. Release pages match
 * on the URL instead, because the injected release route hands `<StarlightPage>` a synthesised
 * entry that does not carry the slug the page was generated from.
 *
 * Routes with no card — blog tag and author listings, 404, and every page when `OG_MODE` limits
 * generation — get `/og.png`.
 */
export const onRequest = defineRouteMiddleware((context) => {
  const { entry, head, sidebar } = context.locals.starlightRoute;
  const isRelease = isReleasePage(context.url.pathname);

  // version pages are not sidebar entries — mark their package's entry instead
  if (isRelease) {
    markCurrentByPrefix(sidebar, context.url.pathname);
  }

  const slug = isRelease ? releaseCardSlug(context.url.pathname) : docsCardSlug(entry?.id ?? '');
  const path = slug !== undefined && hasCard(slug) ? ogImagePath(slug) : '/og.png?v=1';

  head.push(...ogTags(new URL(path, context.site)));
});
