import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

export default {
  async fetch(request, env, ctx) {
    try {
      // Try to serve the static asset
      return await getAssetFromKV({ request, waitUntil: ctx.waitUntil.bind(ctx) })
    } catch (e) {
      // If not found, serve index.html (SPA fallback)
      const url = new URL(request.url)
      url.pathname = '/index.html'
      return await getAssetFromKV({ request: new Request(url, request), waitUntil: ctx.waitUntil.bind(ctx) })
    }
  }
}
