import { levelInfo, type Level } from './progress'

export function ProgressMark({ level }: { level: Level }) {
  const { glyph, label, className } = levelInfo(level)
  return (
    <span
      role="img"
      aria-label={label}
      className={`grid size-5.5 place-items-center rounded-md border border-border text-xs ${className}`}
    >
      {glyph}
    </span>
  )
}
