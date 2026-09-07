import { useEffect, useState } from 'react'
import { Clipboard, RotateCcw } from 'lucide-react'
import {
  clearGoogleAuthEvents,
  getGoogleAuthEvents,
  recordGoogleAuthEvent,
  subscribeGoogleAuthEvents,
} from '../../../utils/googleAuthDiagnostics'

export default function GoogleAuthDiagnostics({ forceVisible = false }) {
  const queryEnabled = new URLSearchParams(location.search).get('debugGoogle') === '1'
  const [events, setEvents] = useState(getGoogleAuthEvents)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const refresh = () => setEvents(getGoogleAuthEvents())
    const lifecycle = (event) => recordGoogleAuthEvent(`browser_${event.type}`, {
      visibility: document.visibilityState,
      focused: document.hasFocus(),
      online: navigator.onLine,
      persisted: Boolean(event.persisted),
    })
    const unsubscribe = subscribeGoogleAuthEvents(refresh)
    const browserEvents = ['pageshow', 'pagehide', 'focus', 'blur', 'online', 'offline']
    browserEvents.forEach((name) => window.addEventListener(name, lifecycle))
    document.addEventListener('visibilitychange', lifecycle)
    return () => {
      unsubscribe()
      browserEvents.forEach((name) => window.removeEventListener(name, lifecycle))
      document.removeEventListener('visibilitychange', lifecycle)
    }
  }, [])

  if (!forceVisible && !queryEnabled) return null

  const report = JSON.stringify({ generated_at: new Date().toISOString(), events }, null, 2)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
    } catch {
      window.prompt('Copia este diagnóstico:', report)
    }
  }

  return (
    <details open={forceVisible} className="border border-amber-300 bg-amber-50 text-amber-950 text-xs">
      <summary className="cursor-pointer p-3 font-bold">
        Diagnóstico de acceso con Google ({events.length} eventos)
      </summary>
      <div className="px-3 pb-3 space-y-2">
        <p>No contiene la credencial de Google ni datos personales.</p>
        <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 border border-amber-200">
          {report}
        </pre>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="flex items-center gap-1 border border-amber-400 bg-white px-2 py-1 font-semibold">
            <Clipboard size={13} /> {copied ? 'Copiado' : 'Copiar diagnóstico'}
          </button>
          <button type="button" onClick={clearGoogleAuthEvents} className="flex items-center gap-1 px-2 py-1">
            <RotateCcw size={13} /> Limpiar
          </button>
        </div>
      </div>
    </details>
  )
}
