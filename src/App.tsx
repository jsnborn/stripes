import { ProgressMark } from './ui/ProgressMark'
import { LEVELS } from './ui/progress'
import { ThemeToggle } from './ui/ThemeToggle'

export default function App() {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-display font-semibold tracking-tight">Stripes</h1>
          <p className="text-sm text-muted">
            A BJJ roadmap from white to blue belt, built on graph algorithms.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="px-6 py-8">
        <h2 className="text-label font-medium tracking-wider text-muted uppercase">
          Progress levels
        </h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {LEVELS.map(({ level, label }) => (
            <li
              key={level}
              className="flex items-center gap-2.5 rounded-node border border-border bg-surface px-3 py-2"
            >
              <ProgressMark level={level} />
              <span className="text-sm">{label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-prose text-sm text-muted">
          The views arrive at PR 13 and PR 13a. This page exists so the design tokens have something
          to prove themselves on.
        </p>
      </main>
    </div>
  )
}
