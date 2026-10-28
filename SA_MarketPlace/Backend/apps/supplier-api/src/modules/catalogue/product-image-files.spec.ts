import { promises as fs } from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  removeProductImageFiles,
  writeProductImageFiles,
} from './product-image-files'

describe('product image files', () => {
  let dir: string

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'product-images-'))
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await fs.rm(dir, { recursive: true, force: true })
  })

  const images = [
    { buffer: Buffer.from('one'), extension: 'jpg' },
    { buffer: Buffer.from('two'), extension: 'png' },
    { buffer: Buffer.from('three'), extension: 'webp' },
  ]

  it('writes each image under a random name, in order, with a relative path', async () => {
    const stored = await writeProductImageFiles(images, dir)

    expect(stored).toHaveLength(3)
    expect(stored.map((file) => path.extname(file.filename))).toEqual([
      '.jpg',
      '.png',
      '.webp',
    ])
    expect(new Set(stored.map((file) => file.filename)).size).toBe(3)
    for (const file of stored) {
      expect(file.path).toBe(path.join('products', file.filename))
    }
    expect(await fs.readFile(path.join(dir, stored[1].filename), 'utf8')).toBe(
      'two',
    )
  })

  it('creates the directory when it does not exist yet', async () => {
    const nested = path.join(dir, 'a', 'b')
    const stored = await writeProductImageFiles(images.slice(0, 1), nested)
    expect(await fs.readdir(nested)).toEqual([stored[0].filename])
  })

  it('removes the files it already wrote when a later write fails', async () => {
    const realWrite = fs.writeFile.bind(fs)
    let calls = 0
    jest.spyOn(fs, 'writeFile').mockImplementation(async (...args) => {
      calls += 1
      if (calls === 3) throw new Error('disk full')
      return realWrite(...(args as Parameters<typeof fs.writeFile>))
    })

    await expect(writeProductImageFiles(images, dir)).rejects.toThrow(
      'disk full',
    )
    expect(await fs.readdir(dir)).toEqual([])
  })

  it('removeProductImageFiles deletes the files and ignores ones already gone', async () => {
    const stored = await writeProductImageFiles(images, dir)
    await fs.rm(path.join(dir, stored[0].filename))

    await expect(removeProductImageFiles(stored, dir)).resolves.toBeUndefined()
    expect(await fs.readdir(dir)).toEqual([])
  })
})
