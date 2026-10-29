import { fetchChannelVideos } from '../server/youtube.js'

const CACHE_MS = 30 * 60 * 1000

export function createVideosHandler({ apiKey = process.env.YOUTUBE_API_KEY, fetchImpl } = {}) {
  let cached
  let expiresAt = 0
  let pending

  return async function videosHandler(req, res) {
    if (req.method !== 'GET') {
      res.writeHead(405, {
        Allow: 'GET',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }
    if (!apiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(
        JSON.stringify({
          error: 'YouTube videos are not configured. Set YOUTUBE_API_KEY on the server.',
        }),
      )
      return
    }

    try {
      if (!cached || Date.now() >= expiresAt) {
        if (!pending) pending = fetchChannelVideos(apiKey, fetchImpl)
        try {
          cached = await pending
          expiresAt = Date.now() + CACHE_MS
        } finally {
          pending = undefined
        }
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=0, s-maxage=1800, stale-while-revalidate=300',
      })
      res.end(JSON.stringify(cached))
    } catch (error) {
      console.error('YouTube video refresh failed:', error)
      res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(
        JSON.stringify({ error: 'Could not load videos from YouTube. Please try again shortly.' }),
      )
    }
  }
}

export default createVideosHandler()
