import { useEffect, useRef, useState } from 'react'
import { Loader2, PackageX, Upload, X } from 'lucide-react'
import { pedidoService, uploadFotoDevolucion } from '../../../services/pedidoService'

const ESTADO_INFO = {
  pendiente: { label: 'Solicitud en revisión', color: 'text-amber-600' },
  aprobada: { label: 'Devolución aprobada', color: 'text-green-700' },
  rechazada: { label: 'Devolución rechazada', color: 'text-red-600' },
  en_transito: { label: 'Devolución en tránsito', color: 'text-violet-700' },
  recibida: { label: 'Devolución recibida', color: 'text-green-700' },
  cancelada: { label: 'Solicitud cancelada', color: 'text-gray-500' },
}

export default function DevolucionPanel({ numero, estadoPedido }) {
  const [devolucion, setDevolucion] = useState(undefined) // undefined = cargando, null = ninguna
  const [formOpen, setFormOpen] = useState(false)
  const [tipo, setTipo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fotos, setFotos] = useState([]) // [{ file, preview }]
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const load = () => {
    pedidoService.getDevolucion(numero)
      .then((data) => setDevolucion(data ?? null))
      .catch(() => setDevolucion(null))
  }

  useEffect(() => { load() }, [numero])

  if (estadoPedido !== 'entregado' || devolucion === undefined) return null

  const puedeSolicitar = !devolucion || ['rechazada', 'cancelada'].includes(devolucion.estado)

  const handleAgregarFotos = (e) => {
    const nuevas = Array.from(e.target.files ?? []).map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setFotos((prev) => [...prev, ...nuevas].slice(0, 5))
    e.target.value = ''
  }

  const quitarFoto = (idx) => setFotos((prev) => prev.filter((_, i) => i !== idx))

  const handleEnviarSolicitud = async () => {
    if (!tipo) { setError('Indica qué pasó con tu pedido'); return }
    if (!motivo.trim()) { setError('Cuéntanos por qué quieres devolver el pedido'); return }
    setLoading(true)
    setError('')
    try {
      const fotoUrls = []
      for (const f of fotos) {
        fotoUrls.push(await uploadFotoDevolucion(f.file, numero))
      }
      await pedidoService.crearDevolucion(numero, { tipo, motivo: motivo.trim(), fotoUrls })
      setFormOpen(false)
      setTipo('')
      setMotivo('')
      setFotos([])
      load()
    } catch (err) {
      setError(err.message || 'No se pudo enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelar = async () => {
    setLoading(true)
    try {
      await pedidoService.cancelarDevolucion(numero)
      load()
    } catch (err) {
      setError(err.message || 'No se pudo cancelar')
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarCodigo = async () => {
    if (!codigo.trim()) return
    setLoading(true)
    setError('')
    try {
      await pedidoService.registrarCodigoRastreoDevolucion(numero, codigo.trim())
      setCodigo('')
      load()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la guía')
    } finally {
      setLoading(false)
    }
  }

  const info = devolucion ? ESTADO_INFO[devolucion.estado] : null

  return (
    <div className="px-4 sm:px-5 pb-4 border-t border-gray-100 pt-3">
      {devolucion && (
        <div className="space-y-2 mb-2">
          <p className={`text-xs font-bold ${info.color}`}>{info.label}</p>

          {devolucion.estado === 'rechazada' && devolucion.adminNota && (
            <p className="text-xs text-gray-500">Motivo: {devolucion.adminNota}</p>
          )}

          {devolucion.estado === 'pendiente' && (
            <button
              type="button"
              onClick={handleCancelar}
              disabled={loading}
              className="text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors disabled:opacity-60"
            >
              Cancelar solicitud
            </button>
          )}

          {(devolucion.estado === 'aprobada' || devolucion.estado === 'en_transito' || devolucion.estado === 'recibida') && devolucion.direccion && (
            <div className="text-xs text-gray-600 bg-gray-50 p-3 space-y-0.5">
              <p className="font-bold text-black">Enviar a: {devolucion.direccion.nombre}</p>
              <p>{devolucion.direccion.direccion}{devolucion.direccion.complemento ? `, ${devolucion.direccion.complemento}` : ''}</p>
              <p>{[devolucion.direccion.barrio, devolucion.direccion.municipio, devolucion.direccion.departamento].filter(Boolean).join(', ')}</p>
              {devolucion.direccion.contactoNombre && (
                <p>{devolucion.direccion.contactoNombre} · {devolucion.direccion.contactoTelefono}</p>
              )}
            </div>
          )}

          {devolucion.estado === 'aprobada' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Número de guía del envío"
                className="flex-1 border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={handleGuardarCodigo}
                disabled={loading || !codigo.trim()}
                className="text-xs font-bold text-white bg-black px-3 py-1.5 hover:bg-gray-800 disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
          )}

          {devolucion.estado === 'en_transito' && devolucion.codigoRastreo && (
            <p className="text-xs text-gray-500">Guía registrada: {devolucion.codigoRastreo}</p>
          )}
        </div>
      )}

      {puedeSolicitar && !formOpen && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-black border border-gray-200 px-3 py-1.5 hover:border-black transition-colors"
        >
          <PackageX size={13} /> Solicitar devolución
        </button>
      )}

      {puedeSolicitar && formOpen && (
        <div className="space-y-2 border border-gray-200 p-3">
          <p className="text-xs font-bold text-black">¿Qué pasó con tu pedido?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('retracto')}
              className={`flex-1 text-xs font-semibold px-2 py-2 border transition-colors ${tipo === 'retracto' ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black'}`}
            >
              Ya no lo quiero
            </button>
            <button
              type="button"
              onClick={() => setTipo('defecto')}
              className={`flex-1 text-xs font-semibold px-2 py-2 border transition-colors ${tipo === 'defecto' ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black'}`}
            >
              Tiene un defecto
            </button>
          </div>
          {tipo === 'retracto' && (
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Tienes 5 días hábiles desde la entrega para devolverlo y te reembolsamos el dinero
              (art. 47, Ley 1480 de 2011). El producto debe conservar su empaque y etiquetas, sin
              señales de uso. No hacemos cambios por talla, color o gusto — solo devolución.
            </p>
          )}
          {tipo === 'defecto' && (
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Cuéntanos el defecto y adjunta fotos — nuestro equipo de calidad lo revisa. Si se
              confirma que es de fábrica, asumimos el costo del envío del cambio.
            </p>
          )}
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={tipo === 'defecto' ? 'Describe el defecto que notaste...' : 'Cuéntanos qué pasó con tu pedido...'}
            rows={3}
            className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black resize-none"
          />
          <div className="flex flex-wrap gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative w-14 h-14 flex-shrink-0">
                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => quitarFoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black text-white flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {fotos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 flex-shrink-0 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors"
              >
                <Upload size={16} />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleAgregarFotos} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnviarSolicitud}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-black px-3 py-1.5 hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? <><Loader2 size={13} className="animate-spin" /> Enviando…</> : 'Enviar solicitud'}
            </button>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setError('') }}
              className="text-xs font-semibold text-gray-400 hover:text-black transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  )
}
