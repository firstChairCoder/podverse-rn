import AsyncStorage from '@react-native-community/async-storage'
import { checkIfIdMatchesClipIdOrEpisodeIdOrAddByUrl, convertToNowPlayingItem, NowPlayingItem } from 'podverse-shared'
import { errorLogger } from '../lib/logger'
import { getDownloadedEpisode } from '../lib/downloadedPodcast'
import { PV } from '../resources'
import { checkIfShouldUseServerData, getBearerToken } from './auth'
import { getQueueItemsLocally } from './queue'
import { request } from './request'
import { getHistoryItemsLocally } from './userHistoryItem'

const _fileName = 'src/services/userNowPlayingItem.ts'

export const getNowPlayingItem = async () => {
  const useServerData = await checkIfShouldUseServerData()
  return useServerData ? getNowPlayingItemOnServer() : getNowPlayingItemLocally()
}

export const setNowPlayingItem = async (item: NowPlayingItem | null, playbackPosition: number) => {
  const useServerData = await checkIfShouldUseServerData()
  return useServerData && !item?.addByRSSPodcastFeedUrl
    ? setNowPlayingItemOnServer(item, playbackPosition)
    : setNowPlayingItemLocally(item, playbackPosition)
}

export const clearNowPlayingItem = async () => {
  const useServerData = await checkIfShouldUseServerData()
  return useServerData ? clearNowPlayingItemOnServer() : clearNowPlayingItemLocally()
}

export const getNowPlayingItemLocally = async () => {
  try {
    const itemString = await AsyncStorage.getItem(PV.Keys.NOW_PLAYING_ITEM)
    const parsedObject = itemString ? JSON.parse(itemString) : {}
    // confirm a valid object is found in storage before returning
    return parsedObject.clipId || parsedObject.episodeId ? parsedObject : null
  } catch (error) {
    errorLogger(_fileName, 'getNowPlayingItemLocally', error)
    return null
  }
}

export const getNowPlayingItemOnServer = async () => {
  const bearerToken = await getBearerToken()
  let item = null
  try {
    const response = (await request({
      endpoint: '/user-now-playing-item',
      method: 'GET',
      headers: {
        Authorization: bearerToken,
        'Content-Type': 'application/json'
      },
      opts: { credentials: 'include' }
    })) as any

    const { episode, mediaRef, userPlaybackPosition } = response.data

    if (!episode && !mediaRef) {
      throw new Error('Response data missing both episode and mediaRef')
    }

    item = convertToNowPlayingItem(mediaRef || episode, null, null, userPlaybackPosition || 0) || {}
  } catch (error) {
    errorLogger(_fileName, 'Error in getNowPlayingItemOnServer: ', error)
    item = null
  }

  return item
}

export const setNowPlayingItemLocally = async (item: NowPlayingItem | null, playbackPosition: number) => {
  if (item) {
    item.userPlaybackPosition = (playbackPosition && Math.floor(playbackPosition)) || 0
    await AsyncStorage.setItem(PV.Keys.NOW_PLAYING_ITEM, JSON.stringify(item))
  }
}

export const setNowPlayingItemOnServer = async (item: NowPlayingItem | null, playbackPosition: number) => {
  if (!item || (!item.clipId && !item.episodeId) || item.addByRSSPodcastFeedUrl) {
    return
  }

  playbackPosition = (playbackPosition && Math.floor(playbackPosition)) || 0

  await setNowPlayingItemLocally(item, playbackPosition)

  const bearerToken = await getBearerToken()
  const { clipId, episodeId, liveItem } = item
  const body = {
    ...(clipId ? { clipId } : { clipId: null }),
    ...(!clipId ? { episodeId } : { episodeId: null }),
    ...(liveItem ? { liveItem } : {}),
    userPlaybackPosition: playbackPosition
  }

  await request({
    endpoint: '/user-now-playing-item',
    method: 'PATCH',
    headers: {
      Authorization: bearerToken,
      'Content-Type': 'application/json'
    },
    body,
    opts: { credentials: 'include' }
  })
}

export const clearNowPlayingItemLocally = async () => {
  try {
    await AsyncStorage.removeItem(PV.Keys.NOW_PLAYING_ITEM)
  } catch (error) {
    errorLogger(_fileName, 'clearNowPlayingItemLocally', error)
  }
}

export const clearNowPlayingItemOnServer = async () => {
  const bearerToken = await getBearerToken()

  await clearNowPlayingItemLocally()

  await request({
    endpoint: '/user-now-playing-item',
    method: 'DELETE',
    headers: {
      Authorization: bearerToken,
      'Content-Type': 'application/json'
    },
    opts: { credentials: 'include' }
  })
}

/*
  This helper gets an enriched version of a NowPlayingItem, setting the userPlaybackPosition,
  and downloaded file path if available. 
  The userPlaybackPosition look up checks in order: 1) history, 2) queue, or 3) downloaded episode storage.
  Only set shouldPlayClip to true if the item is playing *now*. Leave it as false if you are using this
  helper to add items to the queue with userPlaybackPosition set as track.initialTime.
  Sorry this is so hacky :[ this could be cleaned up a ton.
*/
export const getEnrichedNowPlayingItemFromLocalStorage = async (episodeId: string) => {
  if (!episodeId) return null

  const results = await getHistoryItemsLocally()

  const { userHistoryItems } = results
  let currentNowPlayingItem = userHistoryItems.find((x: any) =>
    checkIfIdMatchesClipIdOrEpisodeIdOrAddByUrl(episodeId, x.clipId, x.episodeId)
  )

  if (!currentNowPlayingItem) {
    const queueItems = await getQueueItemsLocally()
    const queueItemIndex = queueItems.findIndex((x: any) =>
      checkIfIdMatchesClipIdOrEpisodeIdOrAddByUrl(episodeId, x.clipId, x.episodeId)
    )
    currentNowPlayingItem = queueItemIndex > -1 && queueItems[queueItemIndex]
  }

  if (!currentNowPlayingItem) {
    currentNowPlayingItem = await getDownloadedEpisode(episodeId)
    if (currentNowPlayingItem) {
      currentNowPlayingItem = convertToNowPlayingItem(
        currentNowPlayingItem,
        null,
        null,
        currentNowPlayingItem.userPlaybackPosition
      )
    }
  }

  return currentNowPlayingItem
}
