import type { StarlightRouteData } from '@astrojs/starlight/route-data';

type Head = StarlightRouteData['head'];

/**
 * The `og:image` / `twitter:image` pair for a card, ready to push onto a route's head.
 *
 * Both sites set these from their route middleware and nowhere else — the pair that used to sit
 * in the `head:` array in `astro.config.mjs` was removed — so no page can end up advertising two
 * different images. Which card a route gets is each site's own business; this only makes sure
 * the two tags always agree with each other.
 */
export function ogTags(image: string | URL): Head {
  const content = image.toString();
  return [
    { tag: 'meta', attrs: { property: 'og:image', content } },
    { tag: 'meta', attrs: { name: 'twitter:image', content } },
  ];
}
