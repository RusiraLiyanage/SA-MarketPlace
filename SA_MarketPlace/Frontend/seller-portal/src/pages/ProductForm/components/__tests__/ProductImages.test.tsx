import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import ProductImages from 'src/pages/ProductForm/components/ProductImages'
import { useProductImages } from 'src/pages/ProductForm/useProductImages'
import type { ProductImage } from 'src/store/catalogue/types'
import { renderWithTheme } from 'src/test/renderWithTheme'

const stored = (id: string, sortOrder: number): ProductImage => ({ id, path: `products/${id}.jpg`, altText: null, isPrimary: sortOrder === 0, sortOrder })

// jsdom has no object URLs.
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

// The component and the hook that feeds it, as the form uses them; `onChange` reports what the hook knows.
const Harness = ({ images, readOnly, onChange }: { images: ProductImage[]; readOnly?: boolean; onChange?: (state: ReturnType<typeof useProductImages>) => void }) => {
  const state = useProductImages(images)
  onChange?.(state)
  return <ProductImages images={state} readOnly={readOnly} />
}

const png = (name = 'a.png', size = 1000) => new File([new Uint8Array(size)], name, { type: 'image/png' })

describe('ProductImages', () => {
  it('shows four slots: the stored pictures, the first marked Main, and empty ones to add to', () => {
    renderWithTheme(<Harness images={[stored('i1', 0), stored('i2', 1)]} />)

    expect(screen.getAllByRole('img', { name: /^Product image/ })).toHaveLength(2)
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add image' })).toHaveLength(2)
  })

  it('serves a stored picture from the backend\'s media address', () => {
    renderWithTheme(<Harness images={[stored('i1', 0)]} />)
    expect(screen.getByRole('img', { name: 'Product image 1' })).toHaveAttribute('src', 'http://localhost:8002/media/products/i1.jpg')
  })

  it('remembers a removed stored picture, so the backend can be told to delete it, and promotes the next as Main', async () => {
    let latest: ReturnType<typeof useProductImages> | undefined
    renderWithTheme(<Harness images={[stored('i1', 0), stored('i2', 1)]} onChange={(state) => (latest = state)} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove image 1' }))

    expect(latest?.removedIds).toEqual(['i1'])
    expect(screen.getAllByRole('img', { name: /^Product image/ })).toHaveLength(1)
    expect(screen.getByText('Main')).toBeInTheDocument()
  })

  it('adds files after the stored ones and keeps them to send', async () => {
    let latest: ReturnType<typeof useProductImages> | undefined
    renderWithTheme(<Harness images={[stored('i1', 0)]} onChange={(state) => (latest = state)} />)

    await userEvent.upload(screen.getByLabelText('Choose images'), [png('a.png'), png('b.png')])

    expect(latest?.added.map(({ file }) => file.name)).toEqual(['a.png', 'b.png'])
    expect(latest?.count).toBe(3)
    expect(screen.getAllByRole('img', { name: /^Product image/ })).toHaveLength(3)
  })

  it('refuses a file that is not an image the backend takes, and says why', async () => {
    renderWithTheme(<Harness images={[]} />)

    await userEvent.upload(screen.getByLabelText('Choose images'), new File(['x'], 'notes.pdf', { type: 'application/pdf' }), { applyAccept: false })

    expect(await screen.findByText('notes.pdf: Images must be JPEG, PNG or WebP')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /^Product image/ })).not.toBeInTheDocument()
  })

  it('refuses a file over 5 MB', async () => {
    renderWithTheme(<Harness images={[]} />)

    await userEvent.upload(screen.getByLabelText('Choose images'), png('big.png', 5 * 1024 * 1024 + 1))

    expect(await screen.findByText('big.png: Each image must be 5 MB or smaller')).toBeInTheDocument()
  })

  it('stops at four, keeping the ones that fit', async () => {
    let latest: ReturnType<typeof useProductImages> | undefined
    renderWithTheme(<Harness images={[stored('i1', 0), stored('i2', 1), stored('i3', 2)]} onChange={(state) => (latest = state)} />)

    await userEvent.upload(screen.getByLabelText('Choose images'), [png('a.png'), png('b.png')])

    expect(latest?.count).toBe(4)
    expect(latest?.canAdd).toBe(false)
    expect(await screen.findByText('A product can have at most 4 images')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add image' })).not.toBeInTheDocument()
  })

  it('shows an icon for a picture whose file cannot be loaded (the seeded products have none)', async () => {
    renderWithTheme(<Harness images={[stored('i1', 0)]} />)

    screen.getByRole('img', { name: 'Product image 1' }).dispatchEvent(new Event('error'))

    expect(await screen.findByLabelText('Image unavailable')).toBeInTheDocument()
  })

  it('cannot be changed when read-only', () => {
    renderWithTheme(<Harness images={[stored('i1', 0)]} readOnly />)

    expect(screen.queryByRole('button', { name: /^Remove image/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add image' })[0]).toBeDisabled()
  })
})
