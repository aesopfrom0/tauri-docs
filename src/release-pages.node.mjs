import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Node-only, and the `.node.` in the filename is load-bearing.
 *
 * This resolves its path from `import.meta.url`, which points at the source file when Node
 * loads the module directly (`astro.config.mjs`) and somewhere else entirely once Vite has
 * processed it. Imported from anywhere inside `src/`, it does not throw — it silently answers
 * `false`, and the caller quietly drops every release page or card. Keep it out of the Vite
 * module graph; `src/release-config.mjs` holds the parts that are safe to import from there.
 */
const contentDir = fileURLToPath(new URL('./content/releases', import.meta.url));

export function hasGeneratedReleasePages() {
  if (!existsSync(contentDir)) {
    return false;
  }
  return readdirSync(contentDir, { withFileTypes: true }).some((entry) => entry.isDirectory());
}
