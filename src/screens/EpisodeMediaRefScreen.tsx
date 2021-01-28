import { convertToNowPlayingItem } from 'podverse-shared'
import { StyleSheet } from 'react-native'
import React from 'reactn'
import { ActionSheet, ClipTableCell, Divider, FlatList, TableSectionSelectors, View } from '../components'
import { getSelectedSortLabel } from '../lib/filters'
import { translate } from '../lib/i18n'
import { PV } from '../resources'
import { retrieveLatestChaptersForEpisodeId } from '../services/episode'
import { getMediaRefs } from '../services/mediaRef'
import { trackPageView } from '../services/tracking'

type Props = {
  navigation: any
}

type State = {
  endOfResultsReached: boolean
  flatListData: any[]
  flatListDataTotalCount: number | null
  isLoading: boolean
  isLoadingMore: boolean
  queryFrom: string
  queryPage: number
  querySort: string
  selectedFilterLabel: string
  selectedItem: string
  selectedSortLabel: string
  showActionSheet: boolean
  viewType: string
}

const testIDPrefix = 'episode_media_ref_screen'

export class EpisodeMediaRefScreen extends React.Component<Props, State> {
  static navigationOptions = ({ navigation }) => {
    return {
      title: navigation.getParam('title') || ''
    }
  }

  constructor(props: Props) {
    super()
    const viewType = props.navigation.getParam('viewType') || null
    const flatListDataTotalCount = props.navigation.getParam('totalItems') || 0
    const existingData = props.navigation.getParam('initialData') || []

    this.state = {
      endOfResultsReached: false,
      flatListData: existingData,
      flatListDataTotalCount,
      isLoading: false,
      isLoadingMore: false,
      queryFrom: PV.Filters._fromThisEpisodeKey,
      queryPage: 1,
      querySort: PV.Filters._chronologicalKey,
      selectedFilterLabel: translate('From this episode'),
      selectedItem: null,
      selectedSortLabel: translate('top - week'),
      showActionSheet: false,
      viewType
    }
  }

  async componentDidMount() {
    trackPageView('/episode/mediaRefs', 'EpisodeMediaRef Screen')
  }

  _queryData = async (
    filterKey: string | null,
    queryOptions: {
      queryPage?: number
    } = {}
  ) => {
    const episode = this.props.navigation.getParam('episode') || {}
    const { flatListData, querySort } = this.state

    const newState = {
      isLoading: false,
      isLoadingMore: false
    } as State

    try {
      if (filterKey === PV.Filters._chaptersKey) {
        const results = await retrieveLatestChaptersForEpisodeId(episode.id)
        newState.flatListData = [...flatListData, ...results[0]]
        newState.endOfResultsReached = true
        newState.flatListDataTotalCount = results[1]
      } else if (filterKey === PV.Filters._clipsKey) {
        const results = await getMediaRefs({
          sort: querySort,
          page: queryOptions.queryPage,
          episodeId: episode.id,
          allowUntitled: true
        })

        newState.flatListData = [...flatListData, ...results[0]]
        newState.endOfResultsReached = newState.flatListData.length >= results[1]
        newState.flatListDataTotalCount = results[1]
      } else {
        // assume a sort was selected
        const results = await getMediaRefs({
          sort: filterKey,
          page: 1,
          episodeId: episode.id,
          allowUntitled: true
        })

        newState.flatListData = [...flatListData, ...results[0]]
        newState.endOfResultsReached = newState.flatListData.length >= results[1]
        newState.flatListDataTotalCount = results[1]
      }

      newState.queryPage = queryOptions.queryPage || 1

      return newState
    } catch (error) {
      return newState
    }
  }

  _ItemSeparatorComponent = () => {
    return <Divider />
  }

  _ListHeaderComponent = () => {
    const { navigation } = this.props
    const { selectedFilterLabel, selectedSortLabel, viewType } = this.state
    const addByRSSPodcastFeedUrl = navigation.getParam('addByRSSPodcastFeedUrl') || {}

    return (
      <TableSectionSelectors
        addByRSSPodcastFeedUrl={addByRSSPodcastFeedUrl}
        filterScreenTitle={viewType === PV.Filters._clipsKey ? translate('Clips') : ''}
        handleSelectSortItem={this.handleSelectSortItem}
        hideFilter={viewType === PV.Filters._chaptersKey}
        includePadding={true}
        navigation={navigation}
        screenName='EpisodeMediaRefScreen'
        selectedFilterLabel={selectedFilterLabel}
        selectedSortItemKey={this.state.querySort}
        selectedSortLabel={selectedSortLabel}
        testID={testIDPrefix}
      />
    )
  }

  handleSelectSortItem = async (selectedKey: string) => {
    if (!selectedKey) {
      return
    }

    const selectedSortLabel = getSelectedSortLabel(selectedKey)

    this.setState(
      {
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoading: true,
        queryPage: 1,
        querySort: selectedKey,
        selectedSortLabel
      },
      async () => {
        const newState = await this._queryData(selectedKey)
        this.setState(newState)
      }
    )
  }

  _onEndReached = ({ distanceFromEnd }: { distanceFromEnd: number }) => {
    const { endOfResultsReached, isLoadingMore, queryPage = 1, viewType } = this.state
    if (viewType === PV.Filters._clipsKey && !endOfResultsReached && !isLoadingMore) {
      if (distanceFromEnd > -1) {
        this.setState(
          {
            isLoadingMore: true
          },
          async () => {
            const newState = await this._queryData(viewType, {
              queryPage: queryPage + 1
            })
            this.setState(newState)
          }
        )
      }
    }
  }

  _handleMorePress = (selectedItem: any) => {
    this.setState({
      selectedItem,
      showActionSheet: true
    })
  }

  _handleCancelPress = () => {
    return new Promise((resolve, reject) => {
      this.setState({ showActionSheet: false }, resolve)
    })
  }

  _renderItem = ({ item }) => {
    const episode = this.props.navigation.getParam('episode') || {}

    return (
      <ClipTableCell
        handleMorePress={() => this._handleMorePress(convertToNowPlayingItem(item, episode, episode.podcast))}
        hideImage={true}
        showEpisodeInfo={false}
        showPodcastInfo={false}
        item={item}
      />
    )
  }

  render() {
    const { navigation } = this.props
    const { flatListData, flatListDataTotalCount, isLoadingMore, selectedItem, showActionSheet } = this.state

    return (
      <View style={styles.view}>
        <FlatList
          data={flatListData}
          dataTotalCount={flatListDataTotalCount}
          disableLeftSwipe={true}
          extraData={flatListData}
          isLoadingMore={isLoadingMore}
          ItemSeparatorComponent={this._ItemSeparatorComponent}
          keyExtractor={(item: any) => item.id}
          ListHeaderComponent={this._ListHeaderComponent}
          onEndReached={this._onEndReached}
          renderItem={this._renderItem}
        />
        <ActionSheet
          handleCancelPress={this._handleCancelPress}
          items={() => {
            if (!selectedItem) return []

            return PV.ActionSheet.media.moreButtons(selectedItem, navigation, {
              handleDismiss: this._handleCancelPress
            })
          }}
          showModal={showActionSheet}
          testID={testIDPrefix}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  view: {
    flex: 1
  }
})
