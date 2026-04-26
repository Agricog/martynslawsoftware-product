import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found in index.html')
}

function App() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Martyn&apos;s Law Software
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Product shell</h1>
        <p className="mt-3 text-sm text-slate-600">
          App skeleton is live. Routing, auth, and data layer arrive in upcoming batches.
        </p>
      </div>
    </main>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
