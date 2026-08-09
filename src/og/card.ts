import type { OGImageOptions } from 'astro-og-canvas';

/**
 * The Open Graph card design, shared by both sites.
 *
 * Full-bleed background, logo top-left, title over a short summary, both trimmed to two lines —
 * the design signed off on tauri-apps/tauri-docs#1616. Everything that defines how a card *looks*
 * lives here so the docs site and the releases site can't drift apart; callers supply only what
 * legitimately differs between them (the text, the font stack, and where the assets sit relative
 * to their own build).
 */

/**
 * Character budgets for roughly two rendered lines.
 *
 * An approximation — the real constraint is rendered width, which we can't measure from here.
 * CanvasKit supports `maxLines`/`ellipsis` natively but astro-og-canvas doesn't expose them;
 * once it does, this goes away.
 */
const titleMax = 48;
const descriptionMax = 73;

export function clampToTwoLines(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/[\s.,;:!?-]+$/, '') + '…';
}

export interface CardInput {
  title: string;
  description?: string;
  /** Font files and their matching stack, from `fontStack()`. */
  fonts: string[];
  families: string[];
  /**
   * Directory holding `og-bg.png` and `og-logo.png`, relative to the site's build root:
   * `./src/og/images` for the docs site, `../../src/og/images` from `packages/releases-site`.
   */
  assetsDir: string;
}

export function cardOptions({
  title,
  description = '',
  fonts,
  families,
  assetsDir,
}: CardInput): OGImageOptions {
  const text = (size: number) => ({ size, lineHeight: 1.25, weight: 'Normal' as const, families });

  return {
    format: 'WEBP',
    quality: 90,
    cacheDir: '.cache/og',
    title: clampToTwoLines(title, titleMax),
    description: clampToTwoLines(description, descriptionMax),
    padding: 66,
    bgImage: { path: `${assetsDir}/og-bg.png` },
    logo: { path: `${assetsDir}/og-logo.png` },
    font: { title: text(72), description: text(48) },
    fonts,
  };
}
