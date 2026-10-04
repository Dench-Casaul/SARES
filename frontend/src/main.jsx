import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import NetworkStatus from './NetworkStatus'

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
      .catch((error) => console.error('Failed to register the SARES service worker:', error))
  })
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <NetworkStatus />
    <App />
  </BrowserRouter>
)
