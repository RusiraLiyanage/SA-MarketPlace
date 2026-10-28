import type { ThemeConfig } from 'antd'

// One token swap per app: this is SA Admin's purple, with the app font from the design system.
// White on #722ed1 is 6.9:1, so the fill needs no dark text, and the same purple works as link text.
const PURPLE = '#722ed1'

export const theme: ThemeConfig = {
  token: {
    colorPrimary: PURPLE,
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#cf1322',
    colorBorder: '#d9d9d9',
    colorBgLayout: '#f5f5f5',
    // Text colours that pass WCAG AA (4.5:1) on white and on the grey page. The success, warning and
    // error fills above stay for fills and borders; text on a light tint uses these darker steps instead.
    colorTextDescription: '#666666',
    colorTextTertiary: '#666666',
    // Placeholders, including a disabled select's on its grey fill, at 4.5:1 or more.
    colorTextPlaceholder: '#707070',
    colorLink: PURPLE,
    colorLinkHover: '#531dab',
    colorPrimaryText: PURPLE,
    colorInfoText: '#0958d9',
    colorSuccessText: '#237804',
    colorWarningText: '#874d00',
    colorErrorText: '#a8071a',
    borderRadius: 6,
    controlHeight: 38,
    fontFamily: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  components: {
    Form: { itemMarginBottom: 16 },
    Menu: { itemSelectedColor: PURPLE, itemSelectedBg: '#f9f0ff' },
    Layout: { headerBg: '#ffffff', headerHeight: 64, headerPadding: '0 32px', bodyBg: '#f5f5f5', siderBg: '#ffffff' },
  },
}
