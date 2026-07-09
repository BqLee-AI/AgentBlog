/**
 * 图片上传校验测试（详见 docs/design/11、issue #23）
 *
 * MIME/大小校验、路径遍历防护。
 * 用 app.request + 真实 FormData（Hono/bun 支持）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { setupTestDb, cleanupTestDb, type TestContext } from './helpers/setup'
import { createUser } from './helpers/factory'

let ctx: TestContext
let token: string

beforeAll(async () => {
  ctx = await setupTestDb()
  token = (await createUser(ctx.db, { role: 'user' })).token
})
afterAll(async () => {
  await cleanupTestDb(ctx.dbPath)
})

/** 造一个指定 type 的 File */
function makeFile(name: string, type: string, size = 100): File {
  const buf = new Uint8Array(size)
  return new File([buf], name, { type })
}

/** 6MB 文件（超 5MB 限） */
function makeBigFile(): File {
  return makeFile('big.png', 'image/png', 6 * 1024 * 1024)
}

describe('图片上传校验', () => {
  it('正常 PNG → 201 + url（uuid 文件名）', async () => {
    const form = new FormData()
    form.append('file', makeFile('test.png', 'image/png'))
    form.append('purpose', 'cover')

    const res = await ctx.app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.url).toMatch(/^\/uploads\/cover\//)
    // 🔴 文件名是 uuid，非原名 test.png
    expect(json.data.url).not.toContain('test.png')
    expect(json.data.key).toMatch(/^cover\/[0-9a-f-]+\.png$/)
  })

  it('🔴 .txt → 400 不支持的图片类型', async () => {
    const form = new FormData()
    form.append('file', makeFile('evil.txt', 'text/plain'))

    const res = await ctx.app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.message).toContain('不支持的图片类型')
  })

  it('🔴 >5MB → 400 不能超过 5MB', async () => {
    const form = new FormData()
    form.append('file', makeBigFile())

    const res = await ctx.app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.message).toContain('5MB')
  })

  it('无 token → 401', async () => {
    const form = new FormData()
    form.append('file', makeFile('x.png', 'image/png'))

    const res = await ctx.app.request('/api/upload', {
      method: 'POST',
      body: form,
    })
    expect(res.status).toBe(401)
  })

  it('🔴 purpose=../../etc → 归 misc，不路径遍历', async () => {
    const form = new FormData()
    form.append('file', makeFile('a.png', 'image/png'))
    form.append('purpose', '../../etc')

    const res = await ctx.app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    // 🔴 落到 misc 目录，未逃逸
    expect(json.data.key).toMatch(/^misc\//)
    expect(json.data.key).not.toContain('..')
  })
})
