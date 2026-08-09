import type { StarlightRouteData } from '@astrojs/starlight/route-data';

type Head = StarlightRouteData['head'];

/**
 * The `og:image` / `twitter:image` pair for a card, ready to push onto a route's head.
 *
 * `src/routeData.ts` sets these and nothing else does: the pair that used to sit in the `head:`
 * array in `astro.config.mjs` was removed with this, so no page can advertise two different
 * images. Which card a route gets is the middleware's business; this only keeps the two tags
 * agreeing with each other.
 */
export function ogTags(image: URL): Head {
  const content = image.toString();
  return [
    { tag: 'meta', attrs: { property: 'og:image', content } },
    { tag: 'meta', attrs: { name: 'twitter:image', content } },
  ];
}
