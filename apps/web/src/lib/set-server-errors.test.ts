/**
 * setServerErrors 纯函数单测。
 *
 * 不依赖 MSW / DOM 渲染：直接构造 fake form（仅需 setError）+ 真实 ApiError，
 * 覆盖验收口径「VALIDATION_ERROR → 回填对应字段错误」。
 * （MSW 基础设施在 #13 接入，本 issue 不提前启用，见 test/setup.ts 注释。）
 */
import { describe, it, expect, vi } from 'vitest'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { ApiError } from '@/lib/http-error'
import { ErrorCode } from '@agentblog/shared'
import { setServerErrors } from '@/lib/set-server-errors'

/** 构造一个只需 setError 的最小 form mock */
function makeForm() {
  return { setError: vi.fn() } as unknown as UseFormReturn<FieldValues>
}

describe('setServerErrors', () => {
  it('VALIDATION_ERROR 带 fields 时回填每个字段的第一条消息', () => {
    const form = makeForm()
    const err = new ApiError(400, ErrorCode.VALIDATION_ERROR, '校验失败', {
      username: ['用户名至少 3 位'],
      password: ['密码至少 6 位'],
    })

    setServerErrors(form, err)

    expect(form.setError).toHaveBeenCalledTimes(2)
    expect(form.setError).toHaveBeenCalledWith('username', { type: 'server', message: '用户名至少 3 位' })
    expect(form.setError).toHaveBeenCalledWith('password', { type: 'server', message: '密码至少 6 位' })
  })

  it('空数组字段被跳过（不回填无消息的字段）', () => {
    const form = makeForm()
    const err = new ApiError(400, ErrorCode.VALIDATION_ERROR, '校验失败', {
      username: ['已存在'],
      password: [], // 空数组：后端可能返回该字段但无消息
    })

    setServerErrors(form, err)

    expect(form.setError).toHaveBeenCalledTimes(1)
    expect(form.setError).toHaveBeenCalledWith('username', { type: 'server', message: '已存在' })
  })

  it('非 ApiError（普通 Error）不回填', () => {
    const form = makeForm()
    setServerErrors(form, new Error('网络错误'))
    expect(form.setError).not.toHaveBeenCalled()
  })

  it('非 VALIDATION_ERROR 的 ApiError（如 401/409）不回填字段', () => {
    const form = makeForm()
    const err = new ApiError(401, ErrorCode.UNAUTHORIZED, '未登录')
    setServerErrors(form, err)
    expect(form.setError).not.toHaveBeenCalled()
  })

  it('VALIDATION_ERROR 但无 fields 不回填', () => {
    const form = makeForm()
    const err = new ApiError(400, ErrorCode.VALIDATION_ERROR, '校验失败')
    setServerErrors(form, err)
    expect(form.setError).not.toHaveBeenCalled()
  })

  it('非 Error 类型（null/字符串）不回填', () => {
    const form = makeForm()
    setServerErrors(form, null)
    setServerErrors(form, 'some string')
    setServerErrors(form, undefined)
    expect(form.setError).not.toHaveBeenCalled()
  })
})
