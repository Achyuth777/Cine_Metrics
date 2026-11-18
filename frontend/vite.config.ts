import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Forwards /tmdb/movie/<id> to TMDB and adds the key on the way out, so the key
 * never reaches the browser or the bundle. Every other path under /tmdb answers
 * 404: this is a lookup for one film's poster, not an open door to the API.
 * A v4 read-access token (three dot-separated parts) is sent as a bearer header;
 * a v3 key is sent as the api_key parameter.
 */
function tmdbProxy(key: string): ProxyOptions {
  const isToken = key.split('.').length === 3
  const lookup = /^\/tmdb\/movie\/(\d+)$/
  return {
    target: 'https://api.themoviedb.org',
    changeOrigin: true,
    bypass: (req) => (lookup.test((req.url ?? '').split('?')[0]) ? undefined : false),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        const id = lookup.exec((req.url ?? '').split('?')[0])?.[1]
        // Set here, not with `rewrite`, so the key never appears in the dev server's log.
        proxyReq.path = `/3/movie/${id}${isToken ? '' : `?api_key=${encodeURIComponent(key)}`}`
        if (isToken) proxyReq.setHeader('Authorization', `Bearer ${key}`)
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Optional. From the shell, or from frontend/.env.local (git-ignored).
  const tmdbKey = (process.env.TMDB_API_KEY ?? loadEnv(mode, process.cwd(), 'TMDB_').TMDB_API_KEY ?? '').trim()

  const proxy: Record<string, ProxyOptions> = {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    }
  }
  if (tmdbKey) proxy['/tmdb'] = tmdbProxy(tmdbKey)

  return {
    plugins: [react(), tailwindcss()],
    // Tells the app whether real posters are available. A yes/no, never the key.
    define: { __TMDB_POSTERS__: JSON.stringify(Boolean(tmdbKey)) },
    server: {
      host: true, // Listen on all network interfaces for local sharing
      port: 5173,
      proxy
    }
  }
})
