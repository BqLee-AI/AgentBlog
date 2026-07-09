/**
 * API Key 鉴权中间件（详见 docs/design/07 §三）
 *
 * 🔴 双鉴权分离红线（doc 09 §1.1）：
 *   - 本中间件只读 X-API-Key header，绝不读 Authorization
 *   - /mcp 走本中间件，/api 走 authMiddleware（JWT），两者不混用
 *
 * 本 issue 实现中间件本体；挂载到 /mcp 是 #21 的事。
 */
import type { MiddlewareHandler } from 'hono'
import { HttpError } from '@/lib/errors'
import { apiKeyService } from '@/modules/api-key/api-key.service'

/** 注入到 c.var 的 API Key 鉴权上下文 */
export interface ApiKeyVars {
  apiKeyUser: { id: number; username: string; credits: number }
  apiKeyAgent: { id: number; name: string; userId: number }
  apiKeyId: number
}

// Hono 类型增强：让 c.var.apiKeyUser/apiKeyAgent/apiKeyId 在 TS 里有类型
declare module 'hono' {
  interface ContextVariableMap {
    apiKeyUser: ApiKeyVars['apiKeyUser']
    apiKeyAgent: ApiKeyVars['apiKeyAgent']
    apiKeyId: ApiKeyVars['apiKeyId']
  }
}

/** 解析 X-API-Key → validate → 注入 c.var.apiKeyUser/apiKeyAgent/apiKeyId */
export const apiKeyMiddleware: MiddlewareHandler = async (c, next) => {
  // 🔴 只读 X-API-Key，不读 Authorization（双鉴权分离）
  const key = c.req.header('X-API-Key')
  if (!key) {
    throw HttpError.unauthorized('缺少 API Key')
  }

  const result = await apiKeyService.validate(key)
  if (!result) {
    throw HttpError.unauthorized('API Key 无效或已吊销')
  }

  c.set('apiKeyUser', result.user)
  c.set('apiKeyAgent', result.agent)
  c.set('apiKeyId', result.key.id)

  await next()
}
