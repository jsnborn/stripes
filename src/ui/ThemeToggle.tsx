import { useState } from 'react'
import { applyTheme, readTheme, type Theme } from '../theme'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
]

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  function choose(next: Theme) {
    applyTheme(next)
    setTheme(next)
  }

  return (
    <fieldset className="flex items-center gap-1 rounded-lg border border-border p-0.5">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
          onClick={() => {
            choose(option.value)
          }}
          className={
            theme === option.value
              ? 'rounded-md bg-accent px-2.5 py-1 text-label font-medium text-surface'
              : 'rounded-md px-2.5 py-1 text-label text-muted hover:text-ink'
          }
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
