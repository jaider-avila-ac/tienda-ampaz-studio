import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, AlertCircle, MapPin, ChevronRight, Loader2, CreditCard, ExternalLink } from 'lucide-react'
import { useCart } from '../../../context/CartContext'
import { getStock, validateCart } from '../../../services/stockService'
import { getProfile } from '../../../services/profileService'
import { pedidoService } from '../../../services/pedidoService'
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from '../../../services/checkoutIntent'
import { getAcceptanceTokens, tokenizeCard } from '../../../services/wompiService'
import { fmt } from '../../../utils/format'
import { siteOrigin } from '../../../utils/seo'
import FormField from '../../../components/ui/FormField'
import FormInput from '../../../components/ui/FormInput'
import CartItem from '../components/CartItem'

const CARD_EMPTY = { numero: '', mes: '', anio: '', cvc: '', titular: '' }

export default function CartPage() {
  const { cart, removeFromCart, updateQty, clearCart, refreshCart, total, shipping, shippingContraEntrega, grandTotal, count, loading: cartLoading, freeShip } = useCart()
  const freeShipActive = freeShip.activo
  const navigate = useNavigate()

  const [direcciones, setDirecciones] = useState([])
  const [selectedDirId, setSelectedDirId] = useState(null)
  const selectedDir = direcciones.find((d) => d.id === selectedDirId) ?? null
  const [hasDocumento, setHasDocumento] = useState(true) // true hasta confirmar lo contrario: evita bloquear el botón mientras carga

  // Validación de stock en tiempo real contra la API
  const [apiValidation, setApiValidation] = useState(null)
  const [validating, setValidating] = useState(false)

  // Pago
  const [metodo, setMetodo] = useState('wompi') // 'wompi' (ventana hospedada) | 'tarjeta' (tokenizada)
  const [acceptanceTokens, setAcceptanceTokens] = useState(null)
  const [card, setCard] = useState(CARD_EMPTY)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptDatos, setAcceptDatos] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  // Mutex SINCRÓNICO (no useState — su efecto sobre el próximo render no es inmediato, ver
  // REAUDITORIA_FUNCIONAL_E_IDEMPOTENCIA.md sección 3.1): si el usuario hace doble clic antes de
  // que React desactive el botón, la segunda invocación se corta acá mismo, sin llegar siquiera
  // a generar una segunda solicitud.
  const checkoutMutexRef = useRef(false)

  useEffect(() => {
    let alive = true
    getProfile()
      .then((profile) => {
        if (!alive) return
        setDirecciones(profile.direcciones)
        setSelectedDirId((current) => current ?? profile.direcciones[0]?.id ?? null)
        setHasDocumento(Boolean(profile.numeroDocumento?.trim()))
      })
      .catch(() => {
        if (alive) setDirecciones([])
      })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    getAcceptanceTokens().then((data) => { if (alive) setAcceptanceTokens(data) }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (cart.length === 0) { setApiValidation([]); return }
    setValidating(true)
    validateCart(cart).then((results) => {
      setApiValidation(results) // null si la API falla → fallback a localStorage
      setValidating(false)
    })
  }, [cart])

  const cartValidated = useMemo(() => cart.map((item) => {
    if (apiValidation === null) {
      // Fallback a localStorage mientras carga o si la API falla
      const s = getStock(item.productId, item.variantes) ?? 0
      return { ...item, stockActual: s, isOutOfStock: s === 0, isOverStock: item.cantidad > s && s > 0 }
    }
    // Buscar resultado de la API para este ítem (API devuelve snake_case por Jackson)
    const res = apiValidation.find((r) =>
      r.product_id === item.productId &&
      (r.talla ?? null) === (item.variantes?.['Talla'] ?? null) &&
      (r.color ?? null) === (item.variantes?.['Color'] ?? null)
    )
    if (!res) {
      // Ítem no encontrado en la validación (producto eliminado)
      return { ...item, stockActual: 0, isOutOfStock: true, isOverStock: false }
    }
    const stock = res.stock_disponible
    return {
      ...item,
      stockActual: stock,
      isOutOfStock: !res.producto_activo || stock === 0,
      isOverStock: res.producto_activo && item.cantidad > stock && stock > 0,
    }
  }), [cart, apiValidation])

  const hasCartIssues = cartValidated.some((i) => i.isOutOfStock || i.isOverStock)
  const canCheckout = !hasCartIssues && !validating && selectedDir !== null && hasDocumento

  const cardValid =
    card.numero.replace(/\s+/g, '').length >= 13 &&
    /^\d{2}$/.test(card.mes) &&
    /^\d{2}$/.test(card.anio) &&
    /^\d{3,4}$/.test(card.cvc) &&
    card.titular.trim().length > 0 &&
    acceptTerms && acceptDatos

  const canSubmit = canCheckout && !processing && (metodo === 'wompi' || (cardValid && acceptanceTokens))

  const setCardField = (key) => (e) => setCard((prev) => ({ ...prev, [key]: e.target.value }))

  const handlePagarWompi = async () => {
    if (checkoutMutexRef.current) return
    checkoutMutexRef.current = true
    setProcessing(true)
    setPaymentError('')

    const intent = { direccionId: selectedDir.id, metodo: 'wompi', cart }

    // Persistida en sessionStorage y atada a la intención (dirección + carrito), con expiración
    // propia a los 3 min (ver checkoutIntent.js) — si la respuesta se pierde por timeout y el
    // usuario reintenta rápido (incluso tras recargar), reusa la MISMA clave en vez de generar una
    // nueva cada vez (I-02, tercera auditoría); pasado ese margen, siempre se genera una nueva
    // referencia — así nunca se reintenta contra una que Wompi ya haya cerrado.
    const idempotencyKey = getOrCreateIdempotencyKey(intent)
    try {
      const data = await pedidoService.checkoutHospedado(selectedDir.id, idempotencyKey)
      // NO se limpia la clave acá (ver Q-01, cuarta auditoría): obtener la URL de Wompi no es un
      // resultado definitivo del pago, solo del PEDIDO. Si el usuario cierra la ventana, vuelve al
      // carrito y paga de nuevo antes de que el pago se resuelva, debe reusar la MISMA clave —así
      // el backend le devuelve el mismo pedido/URL en vez de crear uno segundo mientras el primero
      // todavía puede aprobarse. Se limpia cuando el pedido llega a un estado terminal, o expira
      // sola a los 3 min (ver checkoutIntent.js).
      window.location.href = data.checkout_url
      // No se libera el mutex: la página está a punto de navegar fuera.
    } catch (err) {
      setPaymentError(err.message || 'No se pudo iniciar el pago. Intenta de nuevo.')
      setProcessing(false)
      checkoutMutexRef.current = false
      // La clave NO se limpia: un reintento debe reusarla mientras la intención no cambie.
    }
  }

  const handlePagarTarjeta = async () => {
    if (checkoutMutexRef.current) return
    checkoutMutexRef.current = true
    setProcessing(true)
    setPaymentError('')
    const idempotencyKey = getOrCreateIdempotencyKey({ direccionId: selectedDir.id, metodo: 'tarjeta', cart })
    try {
      const cardToken = await tokenizeCard(
        { number: card.numero, cvc: card.cvc, expMonth: card.mes, expYear: card.anio, cardHolder: card.titular },
        acceptanceTokens.wompi_base_url,
        acceptanceTokens.public_key,
      )
      const data = await pedidoService.checkoutTarjeta({
        direccionId: selectedDir.id,
        cardToken,
        acceptanceToken: acceptanceTokens.acceptance_token,
        personalAuthToken: acceptanceTokens.personal_auth_token,
        idempotencyKey,
      })
      if (data.status === 'DECLINED' || data.status === 'ERROR') {
        setPaymentError(data.mensaje)
        setProcessing(false)
        checkoutMutexRef.current = false
        clearIdempotencyKey() // resultado definitivo (aunque desfavorable) -> un nuevo intento usa clave nueva
        return
      }
      // Q-02 (cuarta auditoría): PENDING NO es un resultado definitivo — Wompi puede aprobarlo
      // después por webhook. Si se limpiara acá, un segundo clic tras volver al carrito (que
      // sigue con los mismos ítems, porque el backend solo lo vacía cuando el pago se confirma)
      // generaría una clave nueva y arriesgaría un segundo cobro real mientras el primero sigue
      // resolviéndose. Solo se limpia para APPROVED, que sí es definitivo.
      if (data.status === 'APPROVED') clearIdempotencyKey()
      await refreshCart()
      navigate(`/pedido/resultado?numero=${data.numero}`)
    } catch (err) {
      setPaymentError(err.message || 'No se pudo procesar el pago. Intenta de nuevo.')
      setProcessing(false)
      checkoutMutexRef.current = false
      // La clave NO se limpia acá: sigue siendo la misma intención, un error de red no es
      // un resultado definitivo (ver I-02).
    }
  }

  const handleCheckout = () => {
    if (!canSubmit || checkoutMutexRef.current) return
    if (metodo === 'wompi') handlePagarWompi()
    else handlePagarTarjeta()
  }

  if (cartLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-sm text-gray-400">
        Cargando tu carrito…
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <ShoppingBag size={32} className="text-gray-300" />
        </div>
        <h2 className="text-xl font-black text-black">Tu carrito está vacío</h2>
        <p className="text-gray-400 text-sm mt-2 mb-6">Agrega productos para continuar</p>
        <Link to="/" className="btn-primary inline-flex">Volver a la tienda</Link>
      </div>
    )
  }

  const waMessage = encodeURIComponent(
    'Pedido Ampaz Studio\n\n' +
    cart.map((i) => {
      const vars = Object.entries(i.variantes ?? {}).map(([k, v]) => `${k}: ${v}`).join(', ')
      return `• ${i.nombre}${vars ? ` (${vars})` : ''} ×${i.cantidad} → ${fmt(i.subtotal)}\n  ${siteOrigin()}/producto/${i.productId}`
    }).join('\n') +
    `\n\nSubtotal: ${fmt(total)}\nEnvío: ${shippingContraEntrega ? 'Contra entrega' : shipping === 0 ? 'Gratis' : fmt(shipping)}\nTotal: ${fmt(grandTotal)}`
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Lista de productos ──────────────────────── */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-black text-black">
            Tu pedido ({count} {count === 1 ? 'artículo' : 'artículos'})
          </h1>
          <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Vaciar carrito
          </button>
        </div>

        {hasCartIssues && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-red-700 leading-snug">
              Algunos artículos tienen problemas de stock. Ajusta las cantidades o elimínalos para continuar.
            </p>
          </div>
        )}

        {freeShipActive && !freeShip.alcanzado && (
          <div className="bg-red-50 border border-red-200 p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-black">
                Agrega {fmt(freeShip.faltante)} más y obtén envío gratis
              </p>
              <div className="mt-1.5 h-1.5 bg-red-100 overflow-hidden">
                <div
                  className="h-full bg-accent-dark transition-all"
                  style={{ width: `${freeShip.progreso}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {freeShip.alcanzado && (
          <div className="bg-accent p-3 text-center">
            <p className="text-xs font-bold text-black">¡Tienes envío gratis!</p>
          </div>
        )}

        {cartValidated.map((item) => (
          <CartItem
            key={item.key}
            item={item}
            onUpdateQty={updateQty}
            onRemove={removeFromCart}
          />
        ))}
      </div>

      {/* ── Resumen + dirección ─────────────────────── */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-gray-100 p-5 sticky top-20 space-y-4">
          <h2 className="text-base font-bold text-black pb-3 border-b border-gray-100">Resumen del pedido</h2>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dirección de envío</p>

            {direcciones.length === 0 ? (
              <Link
                to="/configuracion"
                className="flex items-center justify-between gap-2 p-3 border border-dashed border-gray-300 text-sm text-gray-500 hover:border-accent hover:text-black transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>Agrega una dirección de envío</span>
                </div>
                <ChevronRight size={14} />
              </Link>
            ) : (
              <div className="space-y-2">
                {direcciones.map((d) => (
                  <label
                    key={d.id}
                    className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                      selectedDirId === d.id
                        ? 'border-accent bg-gray-50'
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="direccion"
                      value={d.id}
                      checked={selectedDirId === d.id}
                      onChange={() => setSelectedDirId(d.id)}
                      className="mt-0.5 flex-shrink-0 accent-black"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-black leading-snug line-clamp-1">
                        {d.direccion}{d.apartamento ? `, Apto ${d.apartamento}` : ''}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {[d.barrio, d.municipio, d.departamento].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-[11px] text-gray-400">{d.contactoNombre} · +57 {d.contactoTelefono}</p>
                    </div>
                  </label>
                ))}
                <Link to="/configuracion" className="block text-[11px] text-gray-400 hover:text-black transition-colors mt-1">
                  + Agregar otra dirección
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal ({count} art.)</span>
              <span className="font-semibold">{fmt(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Envío</span>
              <span className={`font-semibold ${shipping === 0 ? 'text-accent' : ''}`}>
                {shippingContraEntrega ? 'Pagas contra entrega' : shipping === 0 ? 'Gratis' : fmt(shipping)}
              </span>
            </div>
            {shippingContraEntrega && (
              <p className="text-xs text-gray-400 -mt-1">
                El costo del envío lo pagas directo al transportador cuando recibes tu pedido.
              </p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="font-bold text-black">Total</span>
            <span className="text-xl font-black text-black">{fmt(grandTotal)}</span>
          </div>

          {/* Método de pago */}
          <div className="border-t border-gray-100 pt-3 space-y-2.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodo('wompi')}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border transition-colors ${
                  metodo === 'wompi' ? 'border-accent bg-gray-50' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                <ExternalLink size={13} /> Pagar con Wompi
              </button>
              <button
                type="button"
                onClick={() => setMetodo('tarjeta')}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border transition-colors ${
                  metodo === 'tarjeta' ? 'border-accent bg-gray-50' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                <CreditCard size={13} /> Pagar con tarjeta
              </button>
            </div>

            {metodo === 'wompi' && (
              <p className="text-[11px] text-gray-400">
                Se abrirá la ventana segura de Wompi (tarjeta, PSE, Nequi y más).
              </p>
            )}

            {metodo === 'tarjeta' && (
              <div className="space-y-2.5 pt-1">
                <FormField label="Número de tarjeta">
                  <FormInput value={card.numero} onChange={setCardField('numero')} placeholder="4242 4242 4242 4242" />
                </FormField>
                <div className="grid grid-cols-3 gap-2">
                  <FormField label="Mes">
                    <FormInput value={card.mes} onChange={setCardField('mes')} placeholder="08" maxLength={2} />
                  </FormField>
                  <FormField label="Año">
                    <FormInput value={card.anio} onChange={setCardField('anio')} placeholder="28" maxLength={2} />
                  </FormField>
                  <FormField label="CVV">
                    <FormInput value={card.cvc} onChange={setCardField('cvc')} placeholder="123" maxLength={4} />
                  </FormField>
                </div>
                <FormField label="Titular de la tarjeta">
                  <FormInput value={card.titular} onChange={setCardField('titular')} placeholder="Como aparece en la tarjeta" />
                </FormField>

                {acceptanceTokens ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-start gap-2 text-[11px] text-gray-500">
                      <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-black" />
                      Acepto los{' '}
                      <a href={acceptanceTokens.acceptance_permalink} target="_blank" rel="noopener noreferrer" className="underline">
                        términos y condiciones
                      </a>{' '}de Wompi
                    </label>
                    <label className="flex items-start gap-2 text-[11px] text-gray-500">
                      <input type="checkbox" checked={acceptDatos} onChange={(e) => setAcceptDatos(e.target.checked)} className="mt-0.5 accent-black" />
                      Autorizo el{' '}
                      <a href={acceptanceTokens.personal_auth_permalink} target="_blank" rel="noopener noreferrer" className="underline">
                        tratamiento de mis datos personales
                      </a>
                    </label>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600">Cargando datos de pago…</p>
                )}
              </div>
            )}
          </div>

          {paymentError && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700">{paymentError}</div>
          )}

          <button
            onClick={handleCheckout}
            disabled={!canSubmit}
            className={`w-full py-3.5 font-bold text-sm transition-colors active:scale-95 flex items-center justify-center gap-2 ${
              !canSubmit
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent-dark'
            }`}
          >
            {validating
              ? <><Loader2 size={15} className="animate-spin" /> Verificando stock…</>
              : processing
              ? <><Loader2 size={15} className="animate-spin" /> Procesando pago…</>
              : 'Finalizar compra'
            }
          </button>
          {!selectedDir && !hasCartIssues && (
            <p className="text-xs text-center text-amber-600">Selecciona una dirección de envío</p>
          )}
          {selectedDir && !hasDocumento && !hasCartIssues && (
            <p className="text-xs text-center text-amber-600">
              Registra tu número de cédula en{' '}
              <Link to="/configuracion" className="font-bold underline">Configuración</Link> para continuar
            </p>
          )}

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-gray-100" />
            <span className="text-xs text-gray-400">o</span>
            <hr className="flex-1 border-gray-100" />
          </div>

          <a
            href={`https://wa.me/573015097013?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full border-2 border-gray-200 py-3 font-semibold text-sm text-gray-700 hover:border-accent hover:text-black transition-colors active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Pedir por WhatsApp
          </a>
          <p className="text-xs text-center text-gray-400">Un asesor coordinará el pago y envío</p>
        </div>
      </div>
    </div>
    </div>
  )
}
