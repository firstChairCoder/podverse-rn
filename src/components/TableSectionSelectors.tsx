import { View } from 'react-native'
import React from 'reactn'
import { PV } from '../resources'
import { getFlatCategoryItems } from '../services/category'
import { DropdownButton, Text } from './'

type Props = {
  addByRSSPodcastFeedUrl?: string
  filterScreenTitle?: string
  handleSelectCategoryItem?: any
  handleSelectCategorySubItem?: any
  handleSelectFilterItem?: any
  handleSelectFromItem?: any
  handleSelectSortItem?: any
  hideFilter?: boolean
  includePadding?: boolean
  navigation?: any
  screenName?: string
  selectedCategoryItemKey?: string | null
  selectedCategorySubItemKey?: string | null
  selectedFilterItemKey?: string | null
  selectedFilterLabel?: string | null
  selectedFromItemKey?: string | null
  selectedSortItemKey?: string | null
  selectedSortLabel?: string | null
  testID?: string
}

type State = {
  flatCategoryItems: any[]
}

export class TableSectionSelectors extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      flatCategoryItems: []
    }
  }

  async componentDidMount() {
    const flatCategoryItems = await getFlatCategoryItems()
    this.setState({ flatCategoryItems })
  }

  render() {
    const {
      addByRSSPodcastFeedUrl,
      filterScreenTitle,
      handleSelectCategoryItem,
      handleSelectCategorySubItem,
      handleSelectFilterItem,
      handleSelectFromItem,
      handleSelectSortItem,
      hideFilter,
      includePadding,
      screenName,
      selectedCategoryItemKey,
      selectedCategorySubItemKey,
      selectedFilterItemKey,
      selectedFilterLabel,
      selectedFromItemKey,
      selectedSortItemKey,
      selectedSortLabel
    } = this.props
    const { flatCategoryItems } = this.state
    const { globalTheme } = this.global
    const wrapperStyle = includePadding ? { marginHorizontal: 8 } : {}

    return (
      <View style={[styles.tableSectionHeaderWrapper, wrapperStyle]}>
        <View style={styles.tableSectionHeaderTitleWrapper}>
          {!!selectedFilterLabel && (
            <Text
              fontSizeLargestScale={PV.Fonts.largeSizes.md}
              numberOfLines={1}
              style={[styles.tableSectionHeaderTitleText, globalTheme.tableSectionHeaderText]}>
              {selectedFilterLabel}
            </Text>
          )}
        </View>
        <DropdownButton
          hideFilter={hideFilter}
          onPress={() => {
            this.props.navigation.navigate(PV.RouteNames.FilterScreen, {
              addByRSSPodcastFeedUrl,
              filterScreenTitle,
              flatCategoryItems,
              handleSelectCategoryItem,
              handleSelectCategorySubItem,
              handleSelectFilterItem,
              handleSelectFromItem,
              handleSelectSortItem,
              screenName,
              selectedCategoryItemKey,
              selectedCategorySubItemKey,
              selectedSortItemKey,
              selectedFilterItemKey,
              selectedFromItemKey
            })
          }}
          sortLabel={selectedSortLabel}
        />
      </View>
    )
  }
}

const styles = {
  tableSectionHeaderWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12
  },
  tableSectionHeaderTitleText: {
    flex: 0,
    fontSize: PV.Fonts.sizes.xxl,
    fontWeight: PV.Fonts.weights.bold
  },
  tableSectionHeaderTitleTextSubFrom: {
    flex: 0,
    fontSize: PV.Fonts.sizes.sm,
    marginTop: 2
  },
  tableSectionHeaderTitleTextSubSort: {
    textAlign: 'right',
    flex: 1,
    fontSize: PV.Fonts.sizes.sm,
    marginTop: 2
  },
  tableSectionHeaderTitleWrapper: {}
}
