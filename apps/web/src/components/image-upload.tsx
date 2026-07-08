/**
 * ImageUpload —— 统一图片上传组件。
 *
 * 受控：value（当前 url，可空）、onChange（上传成功回填 url）。
 * 内部调 uploadApi.uploadImage（multipart），上传中禁用、显示预览。
 *
 * 契约：accept 与后端 ALLOWED 对齐（jpg/png/webp/gif，见 11 §三）。
 *       不手设 Content-Type（request multipart 分支处理）。
 *
 * 失败处理：本地 setState 展示错误，不抛出（组件自洽）。
 * 全局 toast（如 401/402）由 request 层副作用 + #07 处理。
 */
import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { uploadApi, type UploadPurpose, type UploadResult } from '@/api/upload.api'
import { ApiError } from '@/lib/http-error'
import { cn } from '@/lib/cn'

interface ImageUploadProps {
  /** 当前图片 URL（已有或刚上传），空表示未上传 */
  value?: string
  /** 上传成功或清除时回调 */
  onChange: (url: string) => void
  purpose?: UploadPurpose
  className?: string
  /** 预览区尺寸提示文案，如「封面 1200×630」 */
  hint?: string
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'

export function ImageUpload({
  value,
  onChange,
  purpose = 'cover',
  className,
  hint,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 选择后重置 input value，允许同一文件再次选择
    e.target.value = ''
    if (!file) return

    setUploading(true)
    setError(null)
    uploadApi
      .uploadImage(file, purpose)
      .then((res: UploadResult) => onChange(res.url))
      .catch((err: unknown) => {
        // 字段级/校验错误展示后端 message；其余全局错误由 request 副作用处理
        setError(err instanceof ApiError ? err.message : '上传失败')
      })
      .finally(() => setUploading(false))
  }

  const hasImage = Boolean(value)

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-md border border-dashed border-input bg-muted/30',
          hasImage ? 'p-0' : 'p-6',
        )}
      >
        {hasImage ? (
          <img
            src={value}
            alt="预览"
            className="max-h-48 w-full rounded-md object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <span>{uploading ? '上传中…' : '点击上传图片'}</span>
            {hint && <span className="text-xs">{hint}</span>}
          </button>
        )}

        {hasImage && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-1 right-1 rounded-md bg-background/80 px-2 py-1 text-xs text-foreground hover:bg-background"
          >
            更换
          </button>
        )}
        {hasImage && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
            aria-label="移除图片"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handlePick}
      />

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
