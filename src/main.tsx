import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, readTheme } from './theme.ts'

// Applied before the first render so a stored choice never flashes the
// system theme first.
applyTheme(readTheme())

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Expected #root in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
