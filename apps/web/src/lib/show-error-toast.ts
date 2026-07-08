/**
 * showErrorToast —— 错误码 → toast 的统一映射（三层防线 §三 落地）。
 *
 * 原则（见 docs/design/frontend/08 §三映射表）：
 *   - 文案直接用后端中文 message，前端不二次翻译（避免漂移）。
 *   - 401 不 toast：request 层已处理（清态+跳登录），重复 toast 会双重打扰。
 *   - 402 不 toast：走 INSUFFICIENT_CREDITS_EVENT 事件，由 RootProviders 监听后统一提示（含充值引导）。
 *   - VALIDATION_ERROR 不 toast：字段级错误由表单就地回填（setServerErrors），
 *     全局重复弹会与字段红框双重提示。
 *   - 其余 ApiError → toast error.message。
 *   - 非 ApiError（网络错误等）→ toast「网络异常，请检查连接」。
 *
 * 使用：Query 全局 mutation onError 兜底 + 业务层需要时手动调用。
 */
import { toast } from 'sonner'
import { ApiError } from '@/lib/http-error'

export function showErrorToast(error: unknown): void {
  if (error instanceof ApiError) {
    // 401 已被 request 层处理（跳登录），不重复打扰
    if (error.isUnauthorized) return
    // 402 走事件（RootProviders 监听 INSUFFICIENT_CREDITS_EVENT 弹含充值引导的 toast）
    if (error.isInsufficientCredits) return
    // VALIDATION_ERROR：字段级错误由表单就地回填（setServerErrors），不全局重复弹
    if (error.isValidation) return
    // 其余：直接用后端中文 message（12 §三 全部中文）
    toast.error(error.message)
    return
  }
  // 非 ApiError：网络异常、未预期 throw
  toast.error('网络异常，请检查连接')
}
