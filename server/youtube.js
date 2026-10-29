import { siteProperties } from '../src/site-properties.js'

const CHANNEL_ID = siteProperties.identity.youtubeChannelId
const API_BASE = 'https://www.googleapis.com/youtube/v3'

export async function fetchChannelVideos(apiKey, fetchImpl = fetch) {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is required')

  async function request(resource, params) {
    const url = new URL(`${API_BASE}/${resource}`)
    for (const [key, value] of Object.entries({ ...params, key: apiKey })) {
      url.searchParams.set(key, String(value))
    }

    const response = await fetchImpl(url)
    if (!response.ok) {
      throw new Error(`YouTube ${resource} request failed with HTTP ${response.status}`)
    }
    return response.json()
  }

  const channel = await request('channels', { part: 'contentDetails', id: CHANNEL_ID })
  const uploadsId = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) throw new Error('YouTube did not return an uploads playlist for this channel')

  const [uploads, popular] = await Promise.all([
    request('playlistItems', { part: 'contentDetails', playlistId: uploadsId, maxResults: 3 }),
    request('search', {
      part: 'snippet',
      channelId: CHANNEL_ID,
      type: 'video',
      order: 'viewCount',
      maxResults: 1,
    }),
  ])
  const recentIds = uploads.items?.map((item) => item.contentDetails?.videoId)
  const popularId = popular.items?.[0]?.id?.videoId
  if (!recentIds?.length || recentIds.some((id) => !id) || !popularId) {
    throw new Error('YouTube did not return the expected recent and popular videos')
  }

  const details = await request('videos', {
    part: 'snippet,statistics',
    id: [...new Set([...recentIds, popularId])].join(','),
  })
  const byId = new Map(details.items?.map((video) => [video.id, video]) || [])
  function toVideo(id) {
    const video = byId.get(id)
    if (!video?.snippet?.title || video.snippet.channelId !== CHANNEL_ID) {
      throw new Error(`YouTube did not return valid details for video ${id}`)
    }
    return {
      id,
      title: video.snippet.title,
      publishedAt: video.snippet.publishedAt,
      viewCount: Number(video.statistics?.viewCount || 0),
    }
  }

  return {
    recent: recentIds.map(toVideo),
    mostViewed: toVideo(popularId),
  }
}
