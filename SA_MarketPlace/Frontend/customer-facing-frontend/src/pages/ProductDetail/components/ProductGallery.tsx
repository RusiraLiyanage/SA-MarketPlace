import { useState } from 'react'
import styled from 'styled-components'
import SAProductImage from 'src/components/SAProductImage'
import { mediaUrl } from 'src/infra/http'
import SAToneTag from 'src/components/SAToneTag'
import type { ProductDetail } from 'src/types'

// A large image with a row of thumbnails; picking a thumbnail swaps the large one.
const ProductGallery = ({ product }: { product: ProductDetail }) => {
  const [selected, setSelected] = useState(0)
  const images = product.images.length > 0 ? product.images : [null]
  const shown = images[selected]

  return (
    <div>
      <Stage>
        <SAProductImage
          // Keyed so a failed picture does not keep the icon showing after another thumbnail is chosen.
          key={shown?.path}
          alt={shown?.altText ?? product.name}
          categorySlug={product.category.slug}
          imageUrl={shown ? mediaUrl(shown.path) : undefined}
        />
        <Verified>
          <SAToneTag tone="info">Verified Seller</SAToneTag>
        </Verified>
      </Stage>
      <Thumbnails>
        {images.map((image, index) => (
          <Thumbnail
            key={image?.path ?? 'placeholder'}
            type="button"
            $selected={index === selected}
            aria-pressed={index === selected}
            aria-label={`Show image ${index + 1}`}
            onClick={() => setSelected(index)}
          >
            <SAProductImage
              alt={image?.altText ?? product.name}
              categorySlug={product.category.slug}
              imageUrl={image ? mediaUrl(image.path) : undefined}
            />
          </Thumbnail>
        ))}
      </Thumbnails>
    </div>
  )
}

export default ProductGallery

const Stage = styled.div`
  position: relative;
  height: 360px;
  overflow: hidden;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;

  > div {
    background: ${({ theme }) => theme.colorBgContainer};
    font-size: 72px;
  }
`

const Verified = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.margin}px;
  left: ${({ theme }) => theme.margin}px;

  .ant-tag {
    margin: 0;
  }
`

const Thumbnails = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.marginSM}px;
  margin-top: ${({ theme }) => theme.marginSM}px;
`

const Thumbnail = styled.button<{ $selected: boolean }>`
  height: 64px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: ${({ theme }) => theme.colorBgContainer};
  border: 2px solid ${({ $selected, theme }) => ($selected ? theme.colorPrimary : theme.colorBorderSecondary)};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;

  > div {
    background: ${({ theme }) => theme.colorBgContainer};
    font-size: 28px;
  }
`
