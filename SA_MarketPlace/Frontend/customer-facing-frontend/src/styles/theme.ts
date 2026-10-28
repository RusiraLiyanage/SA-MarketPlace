import type { ThemeConfig } from 'antd'

// One token swap per app: this is the customer marketplace's blue, with the app font from the design system.
// The blue is #0958d9, a step darker than the designs' #1677ff: white on #1677ff is 4.1:1, under the 4.5:1 AA minimum.
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0958d9',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#cf1322',
    colorBorder: '#d9d9d9',
    colorBgLayout: '#f5f5f5',
    // Text colours that pass WCAG AA (4.5:1) on white and on the grey page. The success, warning and
    // error fills above stay for fills and borders; text on a light tint uses these darker steps instead.
    colorTextDescription: '#666666',
    colorTextTertiary: '#666666',
    colorLink: '#0958d9',
    colorLinkHover: '#003eb3',
    colorPrimaryText: '#0958d9',
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
    Menu: { itemSelectedColor: '#0958d9', horizontalItemSelectedColor: '#0958d9' },
    Layout: { headerBg: '#ffffff', headerHeight: 64, headerPadding: '0 32px', bodyBg: '#f5f5f5' },
  },
}
