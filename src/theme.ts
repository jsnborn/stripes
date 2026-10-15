export type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'stripes.theme'

/**
 * localStorage can throw on access and not only on write — a browser set to
 * block site data raises on the property itself. Every read and write here is
 * guarded, so an unavailable store costs the user persistence, not the app.
 */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage unavailable; fall through to following the system setting.
  }
  return 'system'
}

export function applyTheme(theme: Theme): void {
  // No attribute at all means "follow the system", which is what the
  // prefers-color-scheme media query in index.css reads.
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }

  try {
    if (theme === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, theme)
    }
  } catch {
    // The choice applies to this page load but will not survive a reload.
  }
}
