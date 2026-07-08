import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 Tailwind 类名，处理冲突（如 px-2 px-4 → px-4） */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
