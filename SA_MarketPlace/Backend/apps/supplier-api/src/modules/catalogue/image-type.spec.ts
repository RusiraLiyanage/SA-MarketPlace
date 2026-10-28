import { detectImageType } from './image-type'

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(20),
])
const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(20),
])
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBP'),
  Buffer.alloc(8),
])

describe('detectImageType', () => {
  it('recognises JPEG, PNG and WebP from their first bytes', () => {
    expect(detectImageType(jpeg)).toBe('image/jpeg')
    expect(detectImageType(png)).toBe('image/png')
    expect(detectImageType(webp)).toBe('image/webp')
  })

  it.each([
    ['plain text', Buffer.from('hello world, not an image')],
    ['a GIF', Buffer.from('GIF89a' + '0'.repeat(20))],
    ['a PDF', Buffer.from('%PDF-1.7' + '0'.repeat(20))],
    [
      'a RIFF file that is not WebP',
      Buffer.concat([
        Buffer.from('RIFF'),
        Buffer.alloc(4),
        Buffer.from('WAVE'),
        Buffer.alloc(8),
      ]),
    ],
    ['an empty file', Buffer.alloc(0)],
    ['a truncated PNG header', png.subarray(0, 5)],
  ])('rejects %s', (_label, buffer) => {
    expect(detectImageType(buffer)).toBeNull()
  })
})
