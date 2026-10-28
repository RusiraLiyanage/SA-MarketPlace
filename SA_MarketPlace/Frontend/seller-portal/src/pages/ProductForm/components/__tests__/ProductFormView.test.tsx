import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductFormView from 'src/pages/ProductForm/components/ProductFormView'
import type { CategoryTreeItem, ProductEdit } from 'src/store/catalogue/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const create = vi.fn()
const edit = vi.fn()
// What the backend refuses with, when a test wants it to. A plain function returns the rejection, so a mock does not
// record (and re-throw) it.
const backend = vi.hoisted(() => ({ refusal: undefined as unknown }))
vi.mock('src/store/catalogue/actions', () => ({
  useCreateProductMutation: () => [(body: FormData) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : create(body)) }), { isLoading: false }],
  useEditProductMutation: () => [(arg: unknown) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : edit(arg)) }), { isLoading: false }],
}))

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

const categories: CategoryTreeItem[] = [
  { id: 'cat1', name: 'Collection Kits', children: [{ id: 'sub1', name: 'Hair Testing' }] },
  { id: 'cat2', name: 'Supplies', children: [] },
]

const product = (overrides: Partial<ProductEdit> = {}): ProductEdit => ({
  id: 'p1',
  name: 'Hair Follicle Test Kit',
  description: 'Collection kit',
  sku: 'HFT-003',
  price: '89.00',
  quantity: 12,
  lowStockThreshold: 20,
  listingStatus: 'published',
  categoryId: 'sub1',
  brand: 'Bindi MedSupply',
  manufacturer: null,
  packSize: '1 unit',
  certification: null,
  images: [],
  category: { id: 'cat1', name: 'Collection Kits' },
  subCategory: { id: 'sub1', name: 'Hair Testing' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const show = (item?: ProductEdit) =>
  renderWithRouter(<ProductFormView product={item} categories={categories} />, item ? '/catalogue/p1' : '/catalogue/new', [
    { path: '/catalogue', element: <p>the catalogue</p> },
    { path: '/orders', element: <p>the orders page</p> },
  ])

const choose = async (label: RegExp, option: string) => {
  await userEvent.click(screen.getByLabelText(label))
  await userEvent.click(await screen.findByTitle(option))
}

const fillNewProduct = async (withDescription = true) => {
  await userEvent.type(screen.getByLabelText(/^Product name/), '  Hair Kit ')
  if (withDescription) await userEvent.type(screen.getByLabelText(/^Description/), 'A kit')
  await choose(/^Category/, 'Collection Kits')
  await userEvent.type(screen.getByLabelText(/^SKU/), 'HK-1')
  await userEvent.type(screen.getByLabelText(/^Price/), '19.5')
}

const sent = (body: FormData) => Object.fromEntries([...body.entries()].filter(([, value]) => typeof value === 'string'))

describe('ProductFormView: adding a product', () => {
  beforeEach(() => {
    create.mockReset()
    edit.mockReset()
    backend.refusal = undefined
  })

  it('starts empty, as a draft, with Save draft and Publish', () => {
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'Add product' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Product name/)).toHaveValue('')
  })

  it('asks for the required fields before saving', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByText('Enter the product name')).toBeInTheDocument()
    expect(screen.getByText('Choose a category')).toBeInTheDocument()
    expect(screen.getByText('Enter a SKU')).toBeInTheDocument()
    expect(screen.getByText('Enter a price')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('offers sub-categories only once a category is chosen, and clears the sub-category when the category changes', async () => {
    show()
    expect(screen.getByLabelText(/^Sub-category/)).toBeDisabled()
    expect(screen.getByText('Select a category first')).toBeInTheDocument()

    await choose(/^Category/, 'Collection Kits')
    expect(screen.getByLabelText(/^Sub-category/)).toBeEnabled()
    expect(screen.getByText('Select sub-category')).toBeInTheDocument()

    await choose(/^Sub-category/, 'Hair Testing')
    expect(screen.queryByText('Select sub-category')).not.toBeInTheDocument()

    // Supplies has none, so the box is off again, and the earlier choice is gone.
    await choose(/^Category/, 'Supplies')
    expect(screen.getByLabelText(/^Sub-category/)).toBeDisabled()
    expect(screen.getByText('No sub-categories')).toBeInTheDocument()
  })

  it('needs a description to publish, but not to save a draft', async () => {
    create.mockResolvedValue({})
    show()
    await fillNewProduct(false)

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText('A description is required to publish')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce())
  })

  it('refuses a price the backend would refuse', async () => {
    show()
    await userEvent.type(screen.getByLabelText(/^Price/), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByText('Enter a price above $0 with at most 2 decimals')).toBeInTheDocument()
  })

  it('saves a draft with the chosen category, the trimmed text and the status, then returns to the catalogue', async () => {
    create.mockResolvedValue({})
    const router = show()
    await fillNewProduct()
    await choose(/^Sub-category/, 'Hair Testing')

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(sent(create.mock.calls[0]![0] as FormData)).toEqual({
      name: 'Hair Kit',
      description: 'A kit',
      sku: 'HK-1',
      price: '19.5',
      categoryId: 'sub1',
      quantity: '0',
      lowStockThreshold: '0',
      listingStatus: 'draft',
    })
    expect(await screen.findByText('Draft saved')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/catalogue')
  })

  it('publishes, sending the pictures in the same request', async () => {
    create.mockResolvedValue({})
    show()
    await fillNewProduct()
    await userEvent.upload(screen.getByLabelText('Choose images'), [new File(['x'], 'main.png', { type: 'image/png' }), new File(['y'], 'second.png', { type: 'image/png' })])

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce())
    const body = create.mock.calls[0]![0] as FormData
    expect(body.get('listingStatus')).toBe('published')
    expect(body.getAll('images').map((file) => (file as File).name)).toEqual(['main.png', 'second.png'])
    expect(await screen.findByText('Product published. It is now visible to buyers.')).toBeInTheDocument()
  })

  it('shows a SKU that is already in use on the SKU box, and stays on the form', async () => {
    backend.refusal = { status: 409, code: 'ECB409', message: 'You already have a product with this SKU' }
    const router = show()
    await fillNewProduct()

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByText('You already have a product with this SKU')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/catalogue/new')
  })

  it('shows any other refusal as a message', async () => {
    backend.refusal = { status: 413, code: 'UNKNOWN', message: 'Each image must be 5 MB or smaller' }
    show()
    await fillNewProduct()

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByText('Each image must be 5 MB or smaller')).toBeInTheDocument()
  })
})

describe('ProductFormView: editing a product', () => {
  beforeEach(() => {
    create.mockReset()
    edit.mockReset()
    backend.refusal = undefined
  })

  it('starts with the product as it is stored, and says Save changes for a published one', () => {
    show(product())

    expect(screen.getByRole('heading', { level: 1, name: 'Edit product' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Product name/)).toHaveValue('Hair Follicle Test Kit')
    expect(screen.getByLabelText(/^SKU/)).toHaveValue('HFT-003')
    expect(screen.getByLabelText(/^Price/)).toHaveValue('89.00')
    expect(screen.getByText('Hair Testing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('says so, and sends nothing, when nothing changed', async () => {
    show(product())

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('There are no changes to save')).toBeInTheDocument()
    expect(edit).not.toHaveBeenCalled()
  })

  it('sends only what changed, so stock that sold since the page opened is not overwritten', async () => {
    edit.mockResolvedValue({})
    show(product())

    const name = screen.getByLabelText(/^Product name/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Hair Kit v2')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await vi.waitFor(() => expect(edit).toHaveBeenCalledOnce())
    const { productId, body } = edit.mock.calls[0]![0] as { productId: string; body: FormData }
    expect(productId).toBe('p1')
    expect(sent(body)).toEqual({ name: 'Hair Kit v2' })
    expect(await screen.findByText('Changes saved')).toBeInTheDocument()
  })

  it('takes a published product off sale on Save draft, and says so', async () => {
    edit.mockResolvedValue({})
    show(product())

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await vi.waitFor(() => expect(edit).toHaveBeenCalledOnce())
    expect((edit.mock.calls[0]![0] as { body: FormData }).body.get('listingStatus')).toBe('draft')
    expect(await screen.findByText('Saved as a draft. It is no longer visible to buyers.')).toBeInTheDocument()
  })

  it('publishes a draft', async () => {
    edit.mockResolvedValue({})
    show(product({ listingStatus: 'draft' }))

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    await vi.waitFor(() => expect(edit).toHaveBeenCalledOnce())
    expect((edit.mock.calls[0]![0] as { body: FormData }).body.get('listingStatus')).toBe('published')
    expect(await screen.findByText('Product published. It is now visible to buyers.')).toBeInTheDocument()
  })

  it('refuses to publish once the description has been cleared', async () => {
    show(product({ listingStatus: 'draft' }))

    await userEvent.clear(screen.getByLabelText(/^Description/))
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(await screen.findByText('A description is required to publish')).toBeInTheDocument()
    expect(edit).not.toHaveBeenCalled()
  })

  it('sends the ids of stored pictures that were removed', async () => {
    edit.mockResolvedValue({})
    show(product({ images: [{ id: 'img1', path: 'products/img1.jpg', altText: null, isPrimary: true, sortOrder: 0 }] }))

    await userEvent.click(screen.getByRole('button', { name: 'Remove image 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await vi.waitFor(() => expect(edit).toHaveBeenCalledOnce())
    expect(((edit.mock.calls[0]![0] as { body: FormData }).body).getAll('removeImageIds')).toEqual(['img1'])
  })
})

describe('ProductFormView: a retired product', () => {
  it('is read-only: every box is off, there is nothing to save, and it says why', () => {
    show(product({ listingStatus: 'retired' }))

    expect(screen.getByRole('heading', { level: 1, name: 'View product' })).toBeInTheDocument()
    expect(screen.getByText('This product is retired')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Product name/)).toBeDisabled()
    expect(screen.getByLabelText(/^Price/)).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
    expect(screen.queryByText('Required to publish.')).not.toBeInTheDocument()
  })
})

describe('ProductFormView: leaving with unsaved changes', () => {
  beforeEach(() => {
    create.mockReset()
    edit.mockReset()
    backend.refusal = undefined
  })

  const leave = (router: ReturnType<typeof show>) => act(async () => { await router.navigate('/orders') })
  const inDialog = async (name: string) => userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name }))

  it('does not ask when nothing was changed', async () => {
    const router = show(product())

    await leave(router)

    expect(router.state.location.pathname).toBe('/orders')
  })

  it('does not ask about an empty new product', async () => {
    const router = show()

    await leave(router)

    expect(router.state.location.pathname).toBe('/orders')
  })

  it('asks about a new product once anything is typed, and stays on Keep editing', async () => {
    const router = show()
    await userEvent.type(screen.getByLabelText(/^Product name/), 'Hair Kit')

    await leave(router)

    expect(await screen.findByText('Save your changes?')).toBeInTheDocument()
    await inDialog('Keep editing')
    expect(router.state.location.pathname).toBe('/catalogue/new')
    expect(screen.getByLabelText(/^Product name/)).toHaveValue('Hair Kit')
  })

  it('leaves without saving on Discard changes', async () => {
    const router = show(product())
    await userEvent.type(screen.getByLabelText(/^Product name/), ' v2')
    await leave(router)

    await inDialog('Discard changes')

    await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
    expect(edit).not.toHaveBeenCalled()
  })

  it('saves an edited product as it is, sending only what changed, then leaves', async () => {
    edit.mockResolvedValue({})
    const router = show(product())
    const name = screen.getByLabelText(/^Product name/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Hair Kit v2')
    await leave(router)

    await inDialog('Save changes')

    await vi.waitFor(() => expect(edit).toHaveBeenCalledOnce())
    expect(sent((edit.mock.calls[0]![0] as { body: FormData }).body)).toEqual({ name: 'Hair Kit v2' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
  })

  it('saves a new product as a draft, then leaves', async () => {
    create.mockResolvedValue({})
    const router = show()
    await fillNewProduct()
    await leave(router)

    await inDialog('Save as draft')

    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(((create.mock.calls[0]![0]) as FormData).get('listingStatus')).toBe('draft')
    await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
  })

  it('stays, showing what is missing, when the form cannot be saved yet', async () => {
    const router = show()
    await userEvent.type(screen.getByLabelText(/^Product name/), 'Hair Kit')
    await leave(router)

    await inDialog('Save as draft')

    expect(await screen.findByText('Choose a category')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/catalogue/new')
    expect(create).not.toHaveBeenCalled()
  })

  it('counts an added or removed picture as a change', async () => {
    const router = show(product({ images: [{ id: 'img1', path: 'products/img1.jpg', altText: null, isPrimary: true, sortOrder: 0 }] }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove image 1' }))

    await leave(router)

    expect(await screen.findByText('Save your changes?')).toBeInTheDocument()
  })

  it('does not ask on a retired product, which cannot be edited', async () => {
    const router = show(product({ listingStatus: 'retired' }))

    await leave(router)

    expect(router.state.location.pathname).toBe('/orders')
  })
})
