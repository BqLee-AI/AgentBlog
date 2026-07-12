/**
 * AI 运行时：在线 Agent 流式对话（详见 docs/design/10 §四）
 *
 * 封装 Vercel AI SDK 的 streamText：注入 Agent 的 systemPrompt + 内置工具（复用 #21 的 postTools），
 * 流结束后按实际 Token 扣费。🔴 不落库任何对话记录（messages 由前端维持发回）。
 *
 * 🔴 计费策略（doc 10 §7.1）：
 *   - 只在 onFinish 扣费（usage.totalTokens → tokensToCredits → charge，type='agent_token'）
 *   - 不在流中扣；异常（onError）v1 不扣（doc 10 §7.2 宽松策略）
 *
 * ⚠️ 与 doc 10 §四偏差（以 AI SDK v5 真实 API 为准）：
 *   - onFinish 的 usage 字段是 totalTokens（驼峰，非 total_tokens）
 *   - 返回值用 toUIMessageStreamResponse()（v5，前端 useChat 消费 UI message stream）
 *   - 计费 type 用 'agent_token'（对齐 db schema/shared，非 doc 10 的 spend_token）
 *
 * runtime 不读 Hono Context（供未来其他入口复用）；agent/messages 由调用方传入。
 */
import { streamText, stepCountIs, type CoreMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createAnthropic } from '@ai-sdk/anthropic'
import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'
import { creditService } from '@/modules/credit/credit.service'
import { postTools, toAiSdkTools } from './tools'
import { Role } from '@agentblog/shared'

/** runAgentStream 入参中的 Agent 子集（只需这几个字段） */
export interface RunAgent {
  id: number
  name: string
  systemPrompt: string | null
}

export interface RunOptions {
  agent: RunAgent
  userId: number
  messages: CoreMessage[]
}

/**
 * 按 env.AI_PROVIDER 创建 LanguageModel。
 * - openai：官方端点用 createOpenAI；第三方兼容端点（配了 OPENAI_BASE_URL，如 DeepSeek/智谱/Ollama）
 *   用 createOpenAICompatible。
 * - anthropic：createAnthropic（同样支持可选 baseURL）
 * 缺 key / 不支持的 provider → 抛错（由 errorHandler 转 500/503）。
 *
 * ⚠️ AI SDK v5 的 @ai-sdk/openai v2 对第三方端点有两个不兼容点，故改用 openai-compatible：
 *   1. createOpenAI()(modelId) 默认走 Responses API（/responses），DeepSeek 等只支持
 *      Chat Completions（/chat/completions）→ 404。
 *   2. v2 按模型名前缀猜测 reasoning 模型，非 gpt-3/4/5-chat 前缀一律视为 reasoning，
 *      把 system 消息转成 developer 角色 → DeepSeek 等不认 developer 角色，直接拒绝。
 *   openai-compatible 专为第三方端点设计：走 Chat Completions 且保留 system 角色。
 */
function getModel() {
  if (env.AI_PROVIDER === 'openai') {
    if (!env.OPENAI_API_KEY) {
      throw HttpError.internal('未配置 OPENAI_API_KEY')
    }

    // 配了 OPENAI_BASE_URL → 视为第三方兼容端点，用 openai-compatible（保留 system 角色）
    if (env.OPENAI_BASE_URL) {
      const compatible = createOpenAICompatible({
        name: 'openai-compatible',
        baseURL: env.OPENAI_BASE_URL,
        apiKey: env.OPENAI_API_KEY,
      })
      return compatible(env.AI_MODEL)
    }

    // 官方 OpenAI 端点：用 chat（Chat Completions API）
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
    return openai.chat(env.AI_MODEL)
  }

  if (env.AI_PROVIDER === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) {
      throw HttpError.internal('未配置 ANTHROPIC_API_KEY')
    }
    const anthropic = createAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}),
    })
    return anthropic(env.ANTHROPIC_MODEL)
  }

  throw HttpError.internal(`不支持的 provider: ${env.AI_PROVIDER}`)
}

/**
 * 运行在线 Agent，返回 streamText 结果（调用方调 toUIMessageStreamResponse 得到 SSE 响应）。
 *
 * 🔴 systemPrompt 作 system 参数注入；不在响应里暴露（防 prompt 注入泄露，doc 10 §九）。
 * 🔴 无 Agent.systemPrompt 时用默认（`你是 ${name}...`）。
 * 🔴 onFinish 按 totalTokens 扣费，写流水（type=agent_token）。
 */
export function runAgentStream({ agent, userId, messages }: RunOptions) {
  const toolsMap = toAiSdkTools(
    postTools({ agentId: agent.id, userId, role: Role.USER }),
  )

  const modelName =
    env.AI_PROVIDER === 'anthropic' ? env.ANTHROPIC_MODEL : env.AI_MODEL

  return streamText({
    model: getModel(),
    system: agent.systemPrompt || `你是 ${agent.name}，一个运行在 AgentBlog 上的助手。`,
    messages,
    tools: toolsMap,
    // Agent loop：允许多步工具调用（调工具→看结果→继续推理→再调→…→最终答复）。
    // v5 用 stopWhen + stepCountIs(n) 取代 v4 的 maxSteps；默认 stepCountIs(1) 只调一轮就停。
    // 设为 5 覆盖查文章→写→改等多步场景，超过 5 步通常是死循环且每步耗 token，故设上限防成本失控。
    stopWhen: stepCountIs(5),
    onFinish: async ({ totalUsage }) => {
      // 🔴 流后按实际 token 扣费（向上取整防漏扣）
      // v5 用 totalUsage（所有步骤 token 总和，含工具调用多步），而非单步 usage；
      // totalTokens 为 number | undefined：部分 provider/端点不回传用量，此时不扣费。
      const totalTokens = totalUsage.totalTokens
      if (!totalTokens) return

      const credits = creditService.tokensToCredits(totalTokens)
      if (credits > 0) {
        // 📌 用 tryDeduct 而非 charge：onFinish 在流结束后触发，无法再返回 HTTP 响应，
        //    若用 charge（透支时抛 402）会变成未处理 rejection。
        //    宽松策略（doc 10 §7.2/§7.3）：扣不动则不扣（记日志），用户已透支，下次对话被预检挡。
        const ok = await creditService.tryDeduct(
          userId,
          credits,
          'agent_token',
          `在线对话 ${modelName}（${totalTokens} tokens）`,
        )
        if (!ok) {
          console.warn(`⚠️ 用户 #${userId} 透支 ${credits} credits（在线对话未扣足）`)
        }
      }
    },
  })
}
