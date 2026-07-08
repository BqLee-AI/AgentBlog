# 03 · API 层与请求封装

> 本篇定义前端**所有 HTTP 请求的统一入口**：fetch 封装、统一解包后端 `{ ok, data, error }`、Bearer 注入、401/402 拦截、错误码映射。
> 对接后端 [12 · 统一错误处理与响应规范](../12-统一错误处理与响应规范.md)。这是契约落地的第一层。

---

## 一、设计目标

| 目标 | 做法 |
|------|------|
| 契约对齐 | 解包后端统一响应 `{ ok, data, error }`（后端 [12 §一](../12-统一错误处理与响应规范.md)） |
| 鉴权自动化 | 有 token 自动加 `Authorization: Bearer`（后端 [04 §四](../04-用户认证与会话.md)） |
| 错误统一 | 失败抛 `ApiError`（含 code/status/message/details），业务层只 catch 需要的 |
| 401 自处理 | token 失效自动清登录态 + 跳登录页，业务无感 |
| 类型安全 | 入参/出参类型来自 `@agentblog/shared` |
| 零依赖 | 原生 fetch，不引 axios（Bearer Header 不需要 axios 的拦截器便利） |

---

## 二、统一响应结构的 TS 建模

后端 [12 §一](../12-统一错误处理与响应规范.md) 定义：

```ts
// 成功
{ "ok": true, "data": <T>, "meta"?: {...} }
// 失败
{ "ok": false, "error": { "code": "...", "message": "...", "details"?: {...} } }
```

前端建模（类型放 `@agentblog/shared`，前端引用）：

```ts
// @agentblog/shared 已导出（伪示意，实际由 shared 定义）
export interface ApiSuccess<T> { ok: true; data: T; meta?: Record<string, unknown> }
export interface ApiErrorBody { code: string; message: string; details?: Record<string, unknown> }
export interface ApiFailure { ok: false; error: ApiErrorBody }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
```

> 💡 前端 `request()` 返回 `Promise<T>`（直接给 data，不包 ok），失败时抛 `ApiError`。这样上层 hook 与组件只关心"成功数据"或"异常"。

---

## 三、`ApiError` 类（`src/lib/http-error.ts`）

```ts
import { ErrorCode } from '@agentblog/shared'

/**
 * 前端统一 API 错误。包装后端 error.code / status / message / details。
 * 业务层按 `err.code` 分支，不依赖 message 文案。
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** 便利谓词，常用错误码判断 */
  get isUnauthorized() { return this.code === ErrorCode.UNAUTHORIZED }
  get isForbidden() { return this.code === ErrorCode.FORBIDDEN }
  get isNotFound() { return this.code === ErrorCode.NOT_FOUND }
  get isInsufficientCredits() { return this.code === ErrorCode.INSUFFICIENT_CREDITS }
  get isValidation() { return this.code === ErrorCode.VALIDATION_ERROR }
}
```

> 💡 `ErrorCode` 枚举来自 `@agentblog/shared`，值与后端 [12 §三](../12-统一错误处理与响应规范.md) 错误码表逐一对齐（`UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` / `INSUFFICIENT_CREDITS` / `CONFLICT` / `VALIDATION_ERROR` / `BAD_REQUEST` / `INTERNAL_ERROR`）。

---

## 四、`request()` 核心封装（`src/lib/request.ts`）

> 📌 **所有业务请求必须走 `request()`**，禁止组件/hook 直接调 `fetch`。这是统一拦截的唯一入口。

```ts
import { env } from '@/config/env'
import { ApiError } from '@/lib/http-error'
import type { ApiResponse } from '@agentblog/shared'
import { authStore } from '@/lib/auth-store'
import { queryClient } from '@/lib/query-client'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown                 // 自动 JSON.stringify
  query?: Record<string, string | number | undefined | null>  // 拼 query string
  signal?: AbortSignal
  /** 流式/上传等不需要自动解包的场景（见 §七） */
  raw?: boolean
  /** 标记为公开请求，不注入 Bearer（如阅读端） */
  public?: boolean
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = env.apiBaseUrl   // 开发期为空，走 vite proxy
  const url = `${base}${path}`
  if (!query) return url
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) qs.append(k, String(v))
  }
  const s = qs.toString()
  return s ? `${url}?${s}` : url
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, raw, public: isPublic } = opts

  const headers: Record<string, string> = body ? { ...JSON_HEADERS } : {}

  // 注入 Bearer（公开请求除外）
  if (!isPublic) {
    const token = authStore.getState().token
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  // raw 模式：直接返回 Response，交给调用方处理（流式、SSE、文件下载）
  if (raw) return res as unknown as T

  // 非 JSON 响应兜底
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(res.status, 'INTERNAL_ERROR', `非预期的响应类型：${contentType}`)
  }

  const json: ApiResponse<T> = await res.json()

  // HTTP 层面成功但业务失败（ok:false），或 HTTP 错误
  if (!res.ok || !json.ok) {
    const errBody = json.ok === false
      ? json.error
      : { code: 'INTERNAL_ERROR', message: '服务器内部错误' }
    const apiErr = new ApiError(res.status, errBody.code, errBody.message, errBody.details)

    handleSideEffects(apiErr)   // 401/402 等副作用统一处理（见 §五）
    throw apiErr
  }

  return json.data
}
```

---

## 五、401 / 402 副作用统一处理

```ts
import { router } from '@/app/router'

function handleSideEffects(err: ApiError) {
  // 401：token 失效，清登录态 + 跳登录页 + 清缓存
  if (err.isUnauthorized) {
    authStore.getState().clear()
    queryClient.clear()
    // 避免在登录页重复跳转
    if (router.state.location.pathname !== '/login') {
      router.navigate('/login', {
        replace: true,
        state: { from: router.state.location },
      })
    }
    return
  }

  // 402：余额不足，统一 toast（不阻断 throw，让业务层也能感知）
  if (err.isInsufficientCredits) {
    // 这里用事件/回调解耦，避免 request 层直接依赖 UI
    window.dispatchEvent(new CustomEvent('app:insufficient-credits', { detail: err }))
  }
}
```

> 💡 **为什么用 CustomEvent 解耦 402？** `request()` 是纯逻辑层，不应直接 `import` toast 组件。在 `RootProviders` 里监听该事件并弹 toast（见 [08](./08-错误处理与用户体验.md)）。401 直接处理是因为它强耦合路由与 auth store（同为 lib 层）。
>
> 💡 **401 的全局清缓存**：`queryClient.clear()` 防止旧用户数据残留给下一个登录用户。

---

## 六、API 层文件（`src/api/*.api.ts`）

每域一文件，纯函数，类型来自 shared。**禁止**在这里写 React。

```ts
// src/api/posts.api.ts
import { request } from '@/lib/request'
import type { Post, Paginated, ListPostsQuery } from '@agentblog/shared'

export const postsApi = {
  // 公开：列表（仅 published）
  listPublic(query: ListPostsQuery, signal?: AbortSignal) {
    return request<Paginated<Post>>('/api/posts', {
      method: 'GET',
      query: { ...query },
      signal,
      public: true,
    })
  },

  // 公开：详情（按 slug）
  getBySlug(slug: string, signal?: AbortSignal) {
    return request<Post>(`/api/posts/${encodeURIComponent(slug)}`, { signal, public: true })
  },

  // 受保护：按 id 取（后台编辑，含草稿）
  getByIdForEdit(id: number, signal?: AbortSignal) {
    return request<Post>(`/api/posts/by-id/${id}`, { signal })
  },

  // 受保护：创建
  create(dto: CreatePostDTO) {
    return request<Post>('/api/posts', { method: 'POST', body: dto })
  },

  // 受保护：更新（slug 不可改，后端铁律；前端表单不提供 slug 字段）
  update(id: number, dto: UpdatePostDTO) {
    return request<Post>(`/api/posts/${id}`, { method: 'PATCH', body: dto })
  },

  // 受保护：删除
  remove(id: number) {
    return request<{ deleted: boolean }>(`/api/posts/${id}`, { method: 'DELETE' })
  },
}
```

```ts
// src/api/auth.api.ts
import { request } from '@/lib/request'
import type { User, LoginResult } from '@agentblog/shared'
import { loginSchema, createUserSchema } from '@agentblog/shared'
import type { z } from 'zod'

export const authApi = {
  login(dto: z.infer<typeof loginSchema>) {
    return request<LoginResult>('/api/auth/login', { method: 'POST', body: dto, public: true })
  },
  me() {
    return request<User>('/api/auth/me')
  },
  register(dto: z.infer<typeof createUserSchema>) {
    return request<User>('/api/auth/register', { method: 'POST', body: dto })
  },
}
```

> 💡 DTO 类型优先 `z.infer<typeof xxxSchema>`（schema 来自 shared），与后端 [02 §4.1](../02-目录结构与分层规范.md) "schema 即类型来源"完全对称。**不要**手写 `CreatePostDTO` interface。

---

## 七、特殊场景：文件上传（multipart）

`/api/upload`（后端 [11 §五](../11-图片上传与存储.md)）用 `multipart/form-data`，不走 `request()` 的 JSON 通道：

```ts
// src/api/upload.api.ts
import { env } from '@/config/env'
import { authStore } from '@/lib/auth-store'
import { ApiError } from '@/lib/http-error'
import type { UploadResult } from '@agentblog/shared'
import { ErrorCode } from '@agentblog/shared'

export const uploadApi = {
  async uploadImage(file: File, purpose: 'avatar' | 'cover' | 'misc' = 'cover'): Promise<UploadResult> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('purpose', purpose)

    const token = authStore.getState().token
    const res = await fetch(`${env.apiBaseUrl}/api/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},   // ⚠️ 不要设 Content-Type，浏览器自动带 boundary
      body: fd,
    })

    const json = await res.json()
    if (!res.ok || !json.ok) {
      throw new ApiError(res.status, json.error?.code ?? ErrorCode.INTERNAL_ERROR, json.error?.message ?? '上传失败')
    }
    return json.data
  },
}
```

> ⚠️ **multipart 切勿手设 `Content-Type`**：浏览器会自动加 `boundary=...`，手设反而丢失边界导致后端 `parseBody()` 失败。

---

## 八、特殊场景：流式（`/api/chat`）

`/api/chat` 是 SSE 流式，由 Vercel AI SDK 的 `useChat` 直接消费，**不走 `request()`**。详见 [07](./07-在线对话与流式实现.md)。这里只需保证 `useChat` 的 `headers` 注入 Bearer：

```ts
// src/features/chat/use-chat.ts（节选，完整见 07）
import { useChat as useAiChat } from '@ai-sdk/react'
import { authStore } from '@/lib/auth-store'

const token = authStore.getState().token
useAiChat({ api: '/api/chat', headers: { Authorization: `Bearer ${token}` } })
```

> 💡 `useChat` 内部用 fetch + ReadableStream，Bearer 通过 `headers` 选项传入。401/402 在流开始前由后端以 HTTP 状态码返回，`useChat` 的 `onError` 能捕获（见 [07 §四](./07-在线对话与流式实现.md)）。

---

## 九、错误码 → 前端处理映射总表

| code | status | 前端处理（默认） | 业务可覆盖 |
|------|--------|------------------|------------|
| `VALIDATION_ERROR` | 400 | toast 字段错误（`details`） | 表单内联展示（见 [05](./05-表单校验与组件体系.md)） |
| `BAD_REQUEST` | 400 | toast message | — |
| `UNAUTHORIZED` | 401 | **自动**：清登录态、跳登录、清缓存 | — |
| `FORBIDDEN` | 403 | toast「无权操作」 | 资源归属类可跳 `/forbidden` |
| `NOT_FOUND` | 404 | toast message 或跳 404 | 阅读端跳 404 |
| `INSUFFICIENT_CREDITS` | 402 | **自动**：toast「额度不足，请联系管理员充值」 | 对话/调用前预检（见 [07](./07-在线对话与流式实现.md)） |
| `CONFLICT` | 409 | toast message（如「每个用户只能创建 1 个 Agent」） | — |
| `INTERNAL_ERROR` | 500 | toast「服务器内部错误，请稍后重试」 | — |
| 网络错误 / 超时 | — | toast「网络异常，请检查连接」 | 支持重试按钮 |

> 📌 业务层**默认不 catch** ApiError——交给全局 toast 默认处理（见 [08](./08-错误处理与用户体验.md)）。只在需要"覆盖默认行为"时局部 catch（如登录失败要在表单内联显示而非全局 toast）。

---

## 十、请求取消（配合 TanStack Query）

列表筛选、详情切换时，旧请求应可取消。`request()` 透传 `signal`：

```ts
// features/post/use-posts.ts
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts.api'

export function usePost(slug: string) {
  return useQuery({
    queryKey: ['posts', slug],
    queryFn: ({ signal }) => postsApi.getBySlug(slug, signal),
  })
}
```

TanStack Query 在 queryKey 变化时自动 abort 旧请求，`signal` 传入 fetch 后端连接也会断开（节省服务端资源）。

---

## 十一、本篇交付物清单（D1 收尾自检）

- [ ] `lib/http-error.ts` 的 `ApiError` 完成，谓词与 shared ErrorCode 对齐
- [ ] `lib/request.ts` 的 `request()` 完成：Bearer 注入、JSON 解包、错误抛出、401/402 副作用
- [ ] `api/*.api.ts` 各域文件就位（至少 auth/posts/upload/agents/api-keys/credits/users/tags）
- [ ] 登录 → 拿 token → 调 `/api/auth/me` 成功；token 失效后自动跳登录
- [ ] 文件上传走 multipart，不手设 Content-Type
- [ ] 流式 `/api/chat` 的 Bearer 注入通过 `useChat` headers
- [ ] 全局 toast 监听 `app:insufficient-credits` 事件（与 [08](./08-错误处理与用户体验.md) 联动）

---

**下一篇**：[04 · 状态管理与数据获取](./04-状态管理与数据获取.md)
