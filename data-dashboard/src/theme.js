// antd theme for DataBridge: navy navigation, deep-teal actions, quiet grey ground.
// Status colours carry meaning only: green passed, amber warnings, red blocking.
export const colors = {
  navy: '#0F1C26',
  navyRaised: '#1E3445',
  teal: '#0B5E63',
  ink: '#15212C',
  muted: '#5A6672',
  ground: '#F4F5F7',
  line: '#DDE1E6',
  good: '#1B6E43',
  warn: '#8A4B00',
  bad: '#A4231A',
}

export const theme = {
  token: {
    colorPrimary: colors.teal,
    colorInfo: colors.teal,
    colorSuccess: colors.good,
    colorWarning: '#B25E09',
    colorError: colors.bad,
    colorText: colors.ink,
    colorTextSecondary: colors.muted,
    colorBgLayout: colors.ground,
    colorBorder: '#C7CDD4',
    colorBorderSecondary: colors.line,
    fontFamily: "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: 14,
    borderRadius: 6,
    controlHeight: 36,
  },
  components: {
    Layout: { siderBg: colors.navy, headerBg: '#FFFFFF', bodyBg: colors.ground },
    Menu: {
      darkItemBg: colors.navy,
      darkItemSelectedBg: colors.navyRaised,
      darkItemColor: '#C9D3DC',
      darkItemHoverColor: '#FFFFFF',
      darkItemDisabledColor: '#6E7F8E',
      itemHeight: 44,
    },
    Table: { headerBg: '#FAFBFC', headerColor: colors.muted, headerSplitColor: 'transparent' },
    Card: { headerFontSize: 16 },
  },
}
