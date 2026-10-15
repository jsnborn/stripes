export type Level = 0 | 1 | 2 | 3

/** Every level is a glyph as well as a fill, so progress never reads by colour alone. */
export const LEVELS = [
  { level: 0, glyph: '○', label: 'Unseen', className: 'bg-level0-fill text-level0-ink' },
  { level: 1, glyph: '◔', label: 'Seen', className: 'bg-level1-fill text-level1-ink' },
  { level: 2, glyph: '◑', label: 'Can drill', className: 'bg-level2-fill text-level2-ink' },
  { level: 3, glyph: '●', label: 'Hits it live', className: 'bg-level3-fill text-level3-ink' },
] as const satisfies readonly { level: Level; glyph: string; label: string; className: string }[]

export function levelInfo(level: Level) {
  return LEVELS[level]
}
