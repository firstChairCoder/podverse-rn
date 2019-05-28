import AsyncStorage from '@react-native-community/async-storage'
import RNSecureKeyStore from 'react-native-secure-key-store'
import { hasValidNetworkConnection } from '../lib/network'
import { PV } from '../resources'
import { request } from './request'

export const getPodcast = async (id: string) => {
  const response = await request({
    endpoint: `/podcast/${id}`
  })

  return response.json()
}

export const getPodcasts = async (query: any = {}, nsfwMode?: boolean) => {
  const filteredQuery = {
    ...(query.includeAuthors ? { includeAuthors: query.includeAuthors } : {}),
    ...(query.includeCategories ? { includeCategories: query.includeCategories } : {}),
    ...(query.page ? { page: query.page } : { page: 1 }),
    ...(query.sort ? { sort: query.sort } : { sort: 'top-past-week' }),
    ...(query.searchAuthor ? { searchAuthor: query.searchAuthor } : {}),
    ...(query.searchTitle ? { searchTitle: query.searchTitle } : {})
  } as any

  if (query.categories) {
    filteredQuery.categories = query.categories
  } else if (query.podcastIds) {
    filteredQuery.podcastId = query.podcastIds ? query.podcastIds.join(',') : ['no-results']
  }

  const response = await request({
    endpoint: '/podcast',
    query: filteredQuery
  }, nsfwMode)

  return response.json()
}

export const getSubscribedPodcasts = async (subscribedPodcastIds: [string]) => {
  if (subscribedPodcastIds.length < 1) return []
  const query = {
    podcastIds: subscribedPodcastIds,
    sort: 'alphabetical'
  }
  const isConnected = await hasValidNetworkConnection()

  if (isConnected) {
    const data = await getPodcasts(query, true)
    const subscribedPodcasts = data[0]
    await AsyncStorage.setItem(PV.Keys.SUBSCRIBED_PODCASTS, JSON.stringify(subscribedPodcasts || []))
    return subscribedPodcasts
  } else {
    const subscribedPodcastsJSON = await AsyncStorage.getItem(PV.Keys.SUBSCRIBED_PODCASTS)
    return subscribedPodcastsJSON ? JSON.parse(subscribedPodcastsJSON) : []
  }
}

export const searchPodcasts = async (title?: string, author?: string, nsfwMode?: boolean) => {
  const response = await request({
    endpoint: '/podcast',
    query: {
      sort: 'alphabetical',
      ...(title ? { title } : {}),
      ...(author ? { author } : {}),
      page: 1
    }
  }, nsfwMode)

  return response.json()
}

export const toggleSubscribeToPodcast = async (id: string, isLoggedIn: boolean) => {
  return isLoggedIn ? toggleSubscribeToPodcastOnServer(id) : toggleSubscribeToPodcastLocally(id)
}

const toggleSubscribeToPodcastLocally = async (id: string) => {
  let items = []

  const itemsString = await AsyncStorage.getItem(PV.Keys.SUBSCRIBED_PODCAST_IDS)
  if (itemsString) {
    items = JSON.parse(itemsString)
  }

  const index = items.indexOf(id)
  if (index > -1) {
    items.splice(index, 1)
  } else {
    items.push(id)
  }

  AsyncStorage.setItem(PV.Keys.SUBSCRIBED_PODCAST_IDS, JSON.stringify(items))
  return items
}

const toggleSubscribeToPodcastOnServer = async (id: string) => {
  const bearerToken = await RNSecureKeyStore.get(PV.Keys.BEARER_TOKEN)
  const response = await request({
    endpoint: `/podcast/toggle-subscribe/${id}`,
    headers: { Authorization: bearerToken }
  })

  return response.json()
}
