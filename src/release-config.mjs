/**
 * Safe to import from anywhere, including the browser bundle and route middleware.
 *
 * Nothing here may touch `node:` or resolve paths from `import.meta.url` — the release
 * filesystem probe lives in `release-pages.node.mjs` for exactly that reason.
 */
export function isReleasePage(pathname) {
  return pathname.startsWith('/release/');
}
