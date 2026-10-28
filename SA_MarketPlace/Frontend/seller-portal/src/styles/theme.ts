import type { ThemeConfig } from 'antd'

// One token swap per app: this is the seller portal's orange, with the app font from the design system.
// The designs' orange #fa8c16 is kept for fills, but white on it is only 2.4:1, under the 4.5:1 AA minimum. So text on an
// orange fill is near-black (6.9:1), and orange used as text (links, the active menu item) is the darker #ad4e00 (5.4:1).
const ORANGE_TEXT = '#ad4e00'
const ON_ORANGE = '#1f1f1f'

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#fa8c16',
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
    colorLink: ORANGE_TEXT,
    colorLinkHover: '#873800',
    colorPrimaryText: ORANGE_TEXT,
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
    Button: { primaryColor: ON_ORANGE },
    Menu: { itemSelectedColor: ORANGE_TEXT, itemSelectedBg: '#fff7e6' },
    Layout: { headerBg: '#ffffff', headerHeight: 64, headerPadding: '0 32px', bodyBg: '#f5f5f5', siderBg: '#ffffff' },
  },
}
