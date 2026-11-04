import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { createVideosHandler } from './api/videos.js'
import { createWuwaCharactersHandler } from './api/wuwa-characters.js'
import { createWuwaWeaponsHandler } from './api/wuwa-weapons.js'
import { createWuwaSonataHandler } from './api/wuwa-sonata.js'
import { createWuwaEchoesHandler } from './api/wuwa-echoes.js'
import { createSilverPalaceCharactersHandler } from './api/sp-characters.js'
import { hoverOnlyPlugin } from './server/hover-only.js'
import { siteProperties } from './src/site-properties.js'

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}

// Serves standalone pages without a trailing slash from their folders. The Wuthering Waves
// page is a client-routed app, so every path beneath it loads the same entry.
const wuwaPage = /^\/(wuthering-waves|wutheringwaves)(\/.*)?$/
const silverPalacePage = /^\/silver-palace(\/.*)?$/

function pageRoutes(request, _response, next) {
  const [path, query = ''] = request.url.split('?')
  if (path === '/portfolio' || path === '/gaming' || path === '/intro') {
    request.url = `${path}/index.html${query ? `?${query}` : ''}`
  } else if (wuwaPage.test(path)) {
    request.url = `/wuthering-waves/index.html${query ? `?${query}` : ''}`
  } else if (silverPalacePage.test(path)) {
    request.url = `/silver-palace/index.html${query ? `?${query}` : ''}`
  }
  next()
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const videosHandler = createVideosHandler({
    apiKey: process.env.YOUTUBE_API_KEY || env.YOUTUBE_API_KEY,
  })
  const wuwaHandler = createWuwaCharactersHandler({
    supabaseUrl: process.env.SUPABASE_URL || env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
    imageBase: process.env.WUWA_IMAGE_BASE || env.WUWA_IMAGE_BASE,
  })
  const echoesHandler = createWuwaEchoesHandler({
    supabaseUrl: process.env.SUPABASE_URL || env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
    imageBase: process.env.WUWA_IMAGE_BASE || env.WUWA_IMAGE_BASE,
  })
  const sonataHandler = createWuwaSonataHandler({
    supabaseUrl: process.env.SUPABASE_URL || env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
    imageBase: process.env.WUWA_IMAGE_BASE || env.WUWA_IMAGE_BASE,
  })
  const weaponsHandler = createWuwaWeaponsHandler({
    supabaseUrl: process.env.SUPABASE_URL || env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
    imageBase: process.env.WUWA_IMAGE_BASE || env.WUWA_IMAGE_BASE,
  })
  const spCharactersHandler = createSilverPalaceCharactersHandler({
    supabaseUrl: process.env.SUPABASE_URL || env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
    imageBase: process.env.SP_IMAGE_BASE || env.SP_IMAGE_BASE,
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
          const wuwa = context.path.startsWith('/wuthering-waves')
          const silverPalace = context.path.startsWith('/silver-palace')
          const gaming = wuwa || silverPalace || context.path.startsWith('/gaming')
          const metadata = wuwa
            ? siteProperties.metadata.wuwa
            : silverPalace
              ? siteProperties.metadata.silverPalace
              : gaming
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
      {
        name: 'wuwa-characters-api',
        configureServer(server) {
          server.middlewares.use('/api/wuwa-characters', wuwaHandler)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/wuwa-characters', wuwaHandler)
        },
      },
      {
        name: 'wuwa-weapons-api',
        configureServer(server) {
          server.middlewares.use('/api/wuwa-weapons', weaponsHandler)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/wuwa-weapons', weaponsHandler)
        },
      },
      {
        name: 'wuwa-sonata-api',
        configureServer(server) {
          server.middlewares.use('/api/wuwa-sonata', sonataHandler)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/wuwa-sonata', sonataHandler)
        },
      },
      {
        name: 'sp-characters-api',
        configureServer(server) {
          server.middlewares.use('/api/sp-characters', spCharactersHandler)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/sp-characters', spCharactersHandler)
        },
      },
      {
        name: 'wuwa-echoes-api',
        configureServer(server) {
          server.middlewares.use('/api/wuwa-echoes', echoesHandler)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/wuwa-echoes', echoesHandler)
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
          wuwa: resolve(import.meta.dirname, 'wuthering-waves/index.html'),
          silverPalace: resolve(import.meta.dirname, 'silver-palace/index.html'),
        },
      },
    },
  }
})
