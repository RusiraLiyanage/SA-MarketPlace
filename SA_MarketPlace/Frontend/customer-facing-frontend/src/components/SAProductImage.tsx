import {
  AppstoreOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  InboxOutlined,
  SafetyOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { useState, type ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
  alt: string
  categorySlug: string
  /** The image address; without one, or when it fails to load, the category icon shows. */
  imageUrl?: string
}

const CATEGORY_ICONS: Record<string, ReactNode> = {
  'collection-kits': <InboxOutlined />,
  'rapid-tests': <ExperimentOutlined />,
  'chain-of-custody': <FileTextOutlined />,
  supplies: <ToolOutlined />,
  ppe: <SafetyOutlined />,
}

const SAProductImage = ({ alt, categorySlug, imageUrl }: Props) => {
  // A file that is missing or fails to load gives way to the icon, never a broken picture.
  const [failedUrl, setFailedUrl] = useState<string>()

  return (
    <Frame>
      {imageUrl && imageUrl !== failedUrl ? (
        <img src={imageUrl} alt={alt} onError={() => setFailedUrl(imageUrl)} />
      ) : (
        <span role="img" aria-label={alt}>
          {CATEGORY_ICONS[categorySlug] ?? <AppstoreOutlined />}
        </span>
      )}
    </Frame>
  )
}

export default SAProductImage

// The picture fills the box it is given and never makes it bigger: it is laid out out of the flow, so a large or tall photo
// cannot grow past the box and cover the name and price below it.
const Frame = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 96px;
  overflow: hidden;
  background: ${({ theme }) => theme.colorBgLayout};
  color: ${({ theme }) => theme.colorPrimary};
  font-size: 48px;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`
