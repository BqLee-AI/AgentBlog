import { cn } from '@/lib/cn'

const COVER_PALETTES = [
  {
    shell: 'bg-[linear-gradient(135deg,#f8f1df_0%,#d7efe8_52%,#f3b29b_100%)]',
    wash: 'bg-[linear-gradient(160deg,rgba(255,255,255,0.5),rgba(255,255,255,0.08)_48%,rgba(22,43,52,0.08))]',
    glowA: 'bg-[rgba(244,159,117,0.42)]',
    glowB: 'bg-[rgba(53,136,138,0.22)]',
  },
  {
    shell: 'bg-[linear-gradient(145deg,#e8f6f5_0%,#fff4de_58%,#f3cab4_100%)]',
    wash: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.1)_44%,rgba(31,56,64,0.1))]',
    glowA: 'bg-[rgba(255,210,96,0.38)]',
    glowB: 'bg-[rgba(42,151,145,0.24)]',
  },
  {
    shell: 'bg-[linear-gradient(130deg,#f5e5cf_0%,#e0f0ec_46%,#f7d8ca_100%)]',
    wash: 'bg-[linear-gradient(150deg,rgba(255,255,255,0.5),rgba(255,255,255,0.08)_50%,rgba(26,49,55,0.08))]',
    glowA: 'bg-[rgba(255,184,140,0.38)]',
    glowB: 'bg-[rgba(66,163,155,0.22)]',
  },
] as const

function pickPalette(title: string) {
  let hash = 0
  for (const char of title) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return COVER_PALETTES[hash % COVER_PALETTES.length] ?? COVER_PALETTES[0]
}

interface PostCoverProps {
  title: string
  coverUrl: string | null
  className?: string
  imageClassName?: string
  titleClassName?: string
  label?: string
}

export function PostCover({
  title,
  coverUrl,
  className,
  imageClassName,
  titleClassName,
  label = 'AgentBlog',
}: PostCoverProps) {
  const palette = pickPalette(title)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.6rem] border border-primary/10 shadow-[0_24px_60px_-40px_rgba(34,78,78,0.45)]',
        !coverUrl && palette.shell,
        className,
      )}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          className={cn('h-full w-full object-cover', imageClassName)}
        />
      ) : (
        <>
          <div className={cn('absolute inset-0', palette.wash)} />
          <div className={cn('absolute -right-10 top-6 h-28 w-28 rounded-full blur-3xl', palette.glowA)} />
          <div className={cn('absolute bottom-4 left-4 h-24 w-24 rounded-full blur-3xl', palette.glowB)} />
          <div className="absolute inset-x-5 top-5 h-20 rounded-[1.2rem] border border-white/45 bg-white/12 backdrop-blur-sm" />
          <div className="absolute inset-x-5 bottom-5 top-5 rounded-[1.2rem] border border-white/30" />
          <div className="absolute right-10 top-10 h-14 w-14 rounded-full border border-white/50 bg-white/18" />
          <div className="absolute bottom-12 right-12 h-20 w-20 rounded-[1.4rem] border border-white/35 bg-white/12 backdrop-blur-sm" />

          <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-700/72">{label}</span>
            <p className={cn('max-w-[14ch] text-xl font-semibold leading-tight text-slate-900 sm:text-2xl', titleClassName)}>
              {title}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
