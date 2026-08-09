import type { OGImageOptions } from 'astro-og-canvas';

/**
 * The Open Graph card design.
 *
 * Full-bleed background, logo top-left, title over a short summary, both trimmed to two lines —
 * the design signed off on tauri-apps/tauri-docs#1616. Everything that defines how a card *looks*
 * lives here; callers supply only the text and the font stack.
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

function clampToTwoLines(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/[\s.,;:!?-]+$/, '') + '…';
}

/** Holds `og-bg.png` and `og-logo.png`, relative to the site's build root. */
const assetsDir = './src/og/images';

export interface CardInput {
  title: string;
  description?: string;
  /** Font files and their matching stack, from `fontStack()`. */
  fonts: string[];
  families: string[];
}

export function cardOptions({
  title,
  description = '',
  fonts,
  families,
}: CardInput): OGImageOptions {
  const text = (size: number) => ({ size, lineHeight: 1.25, weight: 'Normal' as const, families });

  return {
    format: 'WEBP',
    quality: 90,
    title: clampToTwoLines(title, titleMax),
    description: clampToTwoLines(description, descriptionMax),
    padding: 66,
    bgImage: { path: `${assetsDir}/og-bg.png` },
    logo: { path: `${assetsDir}/og-logo.png` },
    font: { title: text(72), description: text(48) },
    fonts,
  };
}
