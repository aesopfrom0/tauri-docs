import { OGImageRoute } from 'astro-og-canvas';
import { cardOptions } from '../../og/card';
import { fontStack } from '../../og/fonts';
import { ogImageSlug, ogPages } from './_pages';

/**
 * Per-page Open Graph cards.
 *
 * One image per `docs` entry plus one per release package, keyed by card slug. Pages showing
 * fallback content for an untranslated locale reuse the English card, and every version page
 * under a package reuses that package's, so ~600 images cover all ~4,500 built pages — see
 * `src/routeData.ts`. The card design itself lives in `src/og/card.ts`.
 */

/** Latin first, then CJK fallbacks so translated titles render glyphs rather than tofu. */
const { fonts, families } = await fontStack([
  'inter-400',
  'noto-sans-400',
  'noto-sans-sc-400',
  'noto-sans-jp-400',
  'noto-sans-kr-400',
]);

export const { getStaticPaths, GET } = await OGImageRoute({
  pages: ogPages,
  getSlug: (_, page: (typeof ogPages)[string]) => ogImageSlug(page.slug),
  getImageOptions: (_, { title, description }: (typeof ogPages)[string]) =>
    cardOptions({
      title,
      description,
      fonts,
      families,
      assetsDir: './src/og/images',
    }),
});
