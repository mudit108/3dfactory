import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Dev-only handle for debugging / automated checks
if (import.meta.env.DEV) {
  import('./hooks/useFactoryStore').then((m) => (window.__factoryStore = m.useFactoryStore))
  import('./scene/focus').then((m) => (window.__goToView = m.goToView))
}
