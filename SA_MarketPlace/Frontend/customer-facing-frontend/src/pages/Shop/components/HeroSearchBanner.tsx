import { SearchOutlined } from '@ant-design/icons'
import { Input, Typography } from 'antd'
import styled from 'styled-components'

interface Props {
  value: string
  onSearch: (search: string) => void
}

const HeroSearchBanner = ({ value, onSearch }: Props) => (
  <Banner>
    <Title level={1}>Workplace testing marketplace</Title>
    <Subtitle>Browse devices and consumables from verified suppliers.</Subtitle>
    <Search
      // Re-mounts when the URL's search changes (for example "Clear filters"), so the box shows it.
      key={value}
      allowClear
      defaultValue={value}
      prefix={<SearchOutlined />}
      placeholder="Search for test kits, cassettes, PPE..."
      enterButton="Search"
      aria-label="Search products"
      onSearch={(text) => onSearch(text.trim())}
    />
  </Banner>
)

export default HeroSearchBanner

const Banner = styled.section`
  padding: ${({ theme }) => theme.paddingMD}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorPrimary};
`

const Title = styled(Typography.Title)`
  && {
    margin: 0;
    font-size: ${({ theme }) => theme.fontSizeHeading3}px;
    color: ${({ theme }) => theme.colorTextLightSolid};
  }
`

const Subtitle = styled(Typography.Paragraph)`
  && {
    margin-bottom: ${({ theme }) => theme.marginSM}px;
    font-size: ${({ theme }) => theme.fontSizeSM}px;
    color: ${({ theme }) => theme.colorTextLightSolid};
  }
`

const Search = styled(Input.Search)`
  max-width: 640px;

  /* The box and the button are two separate pieces with a gap between them, not one joined bar. */
  && {
    gap: ${({ theme }) => theme.marginXS}px;
  }

  && .ant-input-affix-wrapper,
  && .ant-btn {
    border-radius: ${({ theme }) => theme.borderRadius}px;
  }

  && .ant-input::placeholder {
    color: ${({ theme }) => theme.colorTextSecondary};
  }

  /* White on the blue banner, so it reads as a button; the default primary blue disappears into it. */
  && .ant-btn {
    padding-inline: ${({ theme }) => theme.paddingSM}px;
    border-color: ${({ theme }) => theme.colorBgContainer};
    background: ${({ theme }) => theme.colorBgContainer};
    color: ${({ theme }) => theme.colorPrimary};
    font-weight: 600;
  }

  && .ant-btn:not(:disabled):hover {
    border-color: ${({ theme }) => theme.colorPrimaryBg};
    background: ${({ theme }) => theme.colorPrimaryBg};
    color: ${({ theme }) => theme.colorPrimaryActive};
  }
`
