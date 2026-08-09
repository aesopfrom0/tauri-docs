import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Fonts available to the Open Graph cards on both sites.
 *
 * CanvasKit's `FontMgr` only accepts TTF/OTF, but the `@fontsource/*` npm packages ship
 * woff2/woff only, so these are pulled from the Fontsource API rather than added as
 * dependencies. They land under `node_modules/.cache/`, which Netlify's node_modules cache
 * preserves across builds, so the ~7.5 MB download happens once rather than on every build.
 *
 * Each entry pairs a file with the family name CanvasKit reports for it, because the font
 * stack has to name families exactly as CanvasKit parses them out of the file — astro-og-canvas
 * logs the list it ends up with on startup ("Loaded 5 font families: ..."). The `Thin` suffixes
 * below are not a mistake; Fontsource's CJK TTFs really do report themselves that way. Get one
 * wrong and nothing warns: the family silently fails to match and the card renders tofu.
 * Keeping the pair together is what makes that mistake impossible to make.
 */
const catalog = {
  'inter-400': {
    file: 'inter-400.ttf',
    url: 'https://api.fontsource.org/v1/fonts/inter/latin-400-normal.ttf',
    family: 'Inter',
  },
  'noto-sans-400': {
    file: 'noto-sans-400.ttf',
    url: 'https://api.fontsource.org/v1/fonts/noto-sans/latin-400-normal.ttf',
    family: 'Noto Sans',
  },
  'noto-sans-sc-400': {
    file: 'noto-sans-sc-400.ttf',
    url: 'https://api.fontsource.org/v1/fonts/noto-sans-sc/chinese-simplified-400-normal.ttf',
    family: 'Noto Sans SC Thin',
  },
  'noto-sans-jp-400': {
    file: 'noto-sans-jp-400.ttf',
    url: 'https://api.fontsource.org/v1/fonts/noto-sans-jp/japanese-400-normal.ttf',
    family: 'Noto Sans JP Thin',
  },
  'noto-sans-kr-400': {
    file: 'noto-sans-kr-400.ttf',
    url: 'https://api.fontsource.org/v1/fonts/noto-sans-kr/korean-400-normal.ttf',
    family: 'Noto Sans KR Thin',
  },
} as const;

export type FontName = keyof typeof catalog;

const cacheDir = 'node_modules/.cache/og-fonts';

async function ensureFont(name: FontName): Promise<string | undefined> {
  const { file: filename, url } = catalog[name];
  const file = path.resolve(cacheDir, filename);
  try {
    await access(file);
    return file;
  } catch {
    // Not cached yet — fall through and download.
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    console.log(`[og] downloaded ${filename}`);
    return file;
  } catch (error) {
    // A missing font is silent corruption — cards render tofu rather than failing — so
    // production refuses to build. Elsewhere, warn and carry on so a flaky network doesn't
    // block local work.
    if (process.env.CONTEXT === 'production') throw error;
    console.warn(`[og] could not fetch ${filename}, cards may be missing glyphs:`, error);
    return undefined;
  }
}

/**
 * Download the named fonts if needed and return them with their matching font stack.
 *
 * `families` is ordered as given and deduplicated, so adding a second weight of a family
 * already in the catalog won't produce a duplicate stack entry. A font that couldn't be
 * fetched is dropped from both lists — it can't render anything, and leaving its family in
 * the stack would only make CanvasKit look for something that isn't loaded.
 */
export async function fontStack(
  names: readonly FontName[]
): Promise<{ fonts: string[]; families: string[] }> {
  const loaded = (
    await Promise.all(names.map(async (name) => [name, await ensureFont(name)] as const))
  ).filter((entry): entry is readonly [FontName, string] => typeof entry[1] === 'string');

  return {
    fonts: loaded.map(([, file]) => file),
    families: [...new Set(loaded.map(([name]) => catalog[name].family))],
  };
}
