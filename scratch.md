content
  nav
  PlayerContainer
    * Only knows about player selection
    * Passes allData as prop to PathContainer
    PathContainer
      * Knows about offDef and gridSel
      Header
        ChangePlayerButton
        PlayerName
        OffDefToggle
      CourtContainer
        Canvas
        ClickGrid
        PlayerSelect
      StatsContainer
        PossessionsCount
        PossessionsFG
        Histogam
