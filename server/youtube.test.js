import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchChannelVideos } from './youtube.js'
import { createVideosHandler } from '../api/videos.js'
import { siteProperties } from '../src/site-properties.js'

const channelId = siteProperties.identity.youtubeChannelId
const ids = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc', 'ddddddddddd']

function fakeYouTube() {
  const calls = []
  async function fetchImpl(url) {
    calls.push(url)
    const resource = url.pathname.split('/').pop()
    let data
    if (resource === 'channels') {
      data = {
        items: [
          { contentDetails: { relatedPlaylists: { uploads: channelId.replace(/^UC/, 'UU') } } },
        ],
      }
    } else if (resource === 'playlistItems') {
      data = { items: ids.slice(0, 3).map((id) => ({ contentDetails: { videoId: id } })) }
    } else if (resource === 'search') {
      data = { items: [{ id: { videoId: ids[3] } }] }
    } else if (resource === 'videos') {
      data = {
        items: ids.map((id, index) => ({
          id,
          snippet: { title: `Video ${index + 1}`, channelId, publishedAt: '2026-10-28T00:00:00Z' },
          statistics: { viewCount: String((index + 1) * 100) },
        })),
      }
    } else {
      throw new Error(`Unexpected resource ${resource}`)
    }
    return new Response(JSON.stringify(data), { status: 200 })
  }
  return { calls, fetchImpl }
}

function fakeResponse() {
  return {
    status: null,
    headers: null,
    body: null,
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body) {
      this.body = JSON.parse(body)
    },
  }
}

test('returns the newest three uploads and the channel most-viewed video', async () => {
  const youtube = fakeYouTube()
  const result = await fetchChannelVideos('test-key', youtube.fetchImpl)

  assert.deepEqual(
    result.recent.map((video) => video.id),
    ids.slice(0, 3),
  )
  assert.equal(result.mostViewed.id, ids[3])
  assert.equal(result.mostViewed.viewCount, 400)
  assert.equal(youtube.calls.length, 4)
  assert.equal(
    youtube.calls.find((url) => url.pathname.endsWith('/search')).searchParams.get('order'),
    'viewCount',
  )
  assert.equal(
    youtube.calls.find((url) => url.pathname.endsWith('/search')).searchParams.get('channelId'),
    channelId,
  )
  assert.equal(
    youtube.calls
      .find((url) => url.pathname.endsWith('/playlistItems'))
      .searchParams.get('maxResults'),
    '3',
  )
})

test('reports YouTube failures rather than returning made-up videos', async () => {
  await assert.rejects(
    fetchChannelVideos('test-key', async () => new Response('{}', { status: 403 })),
    /YouTube channels request failed with HTTP 403/,
  )
})

test('caches successful requests and rejects an unconfigured endpoint', async () => {
  const youtube = fakeYouTube()
  const handler = createVideosHandler({ apiKey: 'test-key', fetchImpl: youtube.fetchImpl })
  const first = fakeResponse()
  const second = fakeResponse()
  await handler({ method: 'GET' }, first)
  await handler({ method: 'GET' }, second)
  assert.equal(first.status, 200)
  assert.deepEqual(second.body, first.body)
  assert.equal(youtube.calls.length, 4)
  assert.match(first.headers['Cache-Control'], /s-maxage=1800/)

  const missingKey = fakeResponse()
  await createVideosHandler({ apiKey: '' })({ method: 'GET' }, missingKey)
  assert.equal(missingKey.status, 503)
  assert.match(missingKey.body.error, /YOUTUBE_API_KEY/)
})
