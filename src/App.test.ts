import { expect, test } from 'vitest'
import App from './App'

// A toolchain smoke test: it proves Vitest resolves TypeScript, runs the JSX
// transform, and picks up vite.config.ts. Behaviour tests arrive with the
// algorithms in src/graph.
test('App module loads and exports a component', () => {
  expect(typeof App).toBe('function')
})
