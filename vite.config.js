import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { createVideosHandler } from './api/videos.js'
import { hoverOnlyPlugin } from './server/hover-only.js'
import { siteProperties } from './src/site-properties.js'

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}

// Serves standalone pages without a trailing slash from their folders.
function pageRoutes(request, _response, next) {
  const [path, query = ''] = request.url.split('?')
  if (path === '/portfolio' || path === '/gaming' || path === '/intro') {
    request.url = `${path}/index.html${query ? `?${query}` : ''}`
  }
  next()
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const videosHandler = createVideosHandler({
    apiKey: process.env.YOUTUBE_API_KEY || env.YOUTUBE_API_KEY,
  })

  return {
    base: '/',
    plugins: [
      hoverOnlyPlugin(),
      {
        name: 'page-routes',
        configureServer(server) {
          server.middlewares.use(pageRoutes)
        },
        configurePreviewServer(server) {
          server.middlewares.use(pageRoutes)
        },
      },
      {
        name: 'site-metadata',
        transformIndexHtml(html, context) {
          const gaming = context.path.startsWith('/gaming')
          const metadata = gaming
            ? siteProperties.metadata.gaming
            : siteProperties.metadata.portfolio
          const name = gaming ? siteProperties.identity.channelName : siteProperties.identity.name
          return html
            .replace('__PAGE_TITLE__', escapeHtml(`${name} — ${metadata.title}`))
            .replace('__PAGE_DESCRIPTION__', escapeHtml(`${name} — ${metadata.description}`))
        },
      },
      {
        name: 'youtube-videos-api',
        configureServer(server) {
          server.middlewares.use('/api/videos', videosHandler)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/videos', videosHandler)
        },
      },
    ],
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          portfolio: resolve(import.meta.dirname, 'portfolio/index.html'),
          gaming: resolve(import.meta.dirname, 'gaming/index.html'),
          intro: resolve(import.meta.dirname, 'intro/index.html'),
        },
      },
    },
  }
})
