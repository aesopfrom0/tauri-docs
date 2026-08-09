/**
 * Persist the Open Graph card and font caches between Netlify builds.
 *
 * astro-og-canvas content-hashes every card it renders and reuses the file when the hash is
 * unchanged, but its cache lives on disk and Netlify starts each build from a clean checkout.
 * Without this, every deploy re-renders all ~550 cards; with it, only pages whose title or
 * description actually changed are re-rendered.
 *
 * This is a local plugin rather than `netlify-plugin-cache` because that package was last
 * published in 2020. It does the same thing in a dozen lines using Netlify's own cache utils.
 */
export const onPreBuild = async ({ utils, inputs }) => {
  for (const path of inputs.paths) {
    const restored = await utils.cache.restore(path);
    console.log(restored ? `Restored cache: ${path}` : `No cache found: ${path}`);
  }
};

export const onPostBuild = async ({ utils, inputs }) => {
  for (const path of inputs.paths) {
    const saved = await utils.cache.save(path);
    console.log(saved ? `Saved cache: ${path}` : `Nothing to cache: ${path}`);
  }
};
