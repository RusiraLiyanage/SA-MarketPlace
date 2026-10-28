import { CloseOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import styled from 'styled-components'
import { mediaUrl } from 'src/infra/http'
import { MAX_IMAGES } from 'src/pages/ProductForm/productForm'
import type { useProductImages } from 'src/pages/ProductForm/useProductImages'

type Images = ReturnType<typeof useProductImages>

interface Props {
  images: Images
  /** A retired product's pictures can be seen, not changed. */
  readOnly?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/webp'

// Four slots: the first picture is the one buyers see. Filled slots can be removed; any empty slot adds files.
const ProductImages = ({ images, readOnly }: Props) => {
  const input = useRef<HTMLInputElement>(null)
  const slots = [
    ...images.kept.map((image) => ({ key: image.id, src: mediaUrl(image.path), remove: () => images.removeStored(image.id) })),
    ...images.added.map(({ preview }, index) => ({ key: preview, src: preview, remove: () => images.removeAdded(index) })),
  ]

  return (
    <>
      <Grid>
        {Array.from({ length: MAX_IMAGES }, (_, index) => {
          const slot = slots[index]
          return slot ? (
            <Filled key={slot.key} src={slot.src} main={index === 0} index={index} onRemove={readOnly ? undefined : slot.remove} />
          ) : (
            <Empty key={index} type="button" disabled={readOnly} aria-label="Add image" onClick={() => input.current?.click()}>
              <PlusOutlined aria-hidden />
            </Empty>
          )
        })}
      </Grid>
      <input
        ref={input}
        hidden
        multiple
        type="file"
        accept={ACCEPT}
        aria-label="Choose images"
        onChange={(event) => {
          images.add([...(event.target.files ?? [])])
          // Cleared, so choosing the same file again still counts as a change.
          event.target.value = ''
        }}
      />
    </>
  )
}

interface FilledProps {
  src: string
  main: boolean
  index: number
  onRemove?: () => void
}

const Filled = ({ src, main, index, onRemove }: FilledProps) => {
  // The seeded products' files do not exist; a picture that cannot load shows an icon instead of a broken image.
  const [failed, setFailed] = useState(false)

  return (
    <Slot>
      {failed ? <PictureOutlined aria-label="Image unavailable" /> : <img src={src} alt={`Product image ${index + 1}`} onError={() => setFailed(true)} />}
      {main && <MainTag>Main</MainTag>}
      {onRemove && (
        <Remove type="button" aria-label={`Remove image ${index + 1}`} onClick={onRemove}>
          <CloseOutlined aria-hidden />
        </Remove>
      )}
    </Slot>
  )
}

export default ProductImages

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 96px);
  gap: ${({ theme }) => theme.marginSM}px;
`

const Slot = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  overflow: hidden;
  background: ${({ theme }) => theme.colorFillQuaternary};
  border: 1px solid ${({ theme }) => theme.colorBorderSecondary};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: 28px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const Empty = styled.button`
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colorBorder};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
  color: ${({ theme }) => theme.colorTextDescription};
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colorPrimary};
    color: ${({ theme }) => theme.colorPrimaryText};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const MainTag = styled.span`
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 0 ${({ theme }) => theme.paddingXS}px;
  background: ${({ theme }) => theme.colorPrimary};
  border-top-right-radius: ${({ theme }) => theme.borderRadius}px;
  color: #1f1f1f;
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: 600;
`

const Remove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  background: ${({ theme }) => theme.colorBgContainer};
  border: 1px solid ${({ theme }) => theme.colorBorder};
  border-radius: 50%;
  color: ${({ theme }) => theme.colorText};
  cursor: pointer;
  font-size: 11px;
`
