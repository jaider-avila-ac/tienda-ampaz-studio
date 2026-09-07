import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ShoppingBag, Minus, Plus, Check, Truck, RefreshCw, Shield,
  Star, ChevronRight, AlertCircle, PackageCheck, XCircle, Play, Heart, Loader2,
} from 'lucide-react'
import { getProductById, getRelatedProducts } from '../../../services/productService'
import { getResenas, getEstadoResena, crearResena } from '../../../services/reviewService'
import { getPreguntas, crearPregunta, editarPregunta, eliminarPregunta } from '../../../services/preguntaService'
import { getCategoryById } from '../../../services/categoryService'
import { getStock, initStockFromProduct } from '../../../services/stockService'
import { addReciente } from '../../../services/recentService'
import { registrarEvento } from '../../../services/eventoService'
import ProductCard from '../../../components/ui/ProductCard'
import { useCart } from '../../../context/CartContext'
import { useAuth } from '../../../context/AuthContext'
import { useWishlist } from '../../../context/WishlistContext'
import { fmt } from '../../../utils/format'
import { absoluteUrl, removeJsonLd, setCanonical, setMetaTag, siteOrigin, upsertJsonLd } from '../../../utils/seo'

/* ── Helpers de variantes ─────────────────────────────── */

function getVariante(product, nombre) {
  return product.variantes?.find((v) => v.nombre === nombre) ?? null
}

function calcPrecioExtra(product, seleccionadas) {
  const tallaV = getVariante(product, 'Talla')
  if (tallaV && seleccionadas['Talla']) {
    return tallaV.opciones.find((o) => o.valor === seleccionadas['Talla'])?.precioExtra ?? 0
  }
  return 0
}

/* ── Características ──────────────────────────────────── */

function buildCaracteristicas(product, category) {
  const base = [
    ['Marca', product.marca],
    ['Categoría', category?.nombre ?? '—'],
    ['Subcategoría', product.subcategoria],
  ]
  const extra = Object.entries(product.caracteristicas ?? {})
  return [...base, ...extra]
}

function stockRequiredNames(product) {
  const combos = product?.stockVariantes ?? []
  const names = []
  if (combos.some((v) => v.talla)) names.push('Talla')
  if (combos.some((v) => v.color)) names.push('Color')
  return names
}

function plainText(value, fallback = '') {
  return String(value || fallback).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function productAvailability(stock) {
  return Number(stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
}

function productSeoData(product, category, resenas) {
  const origin = siteOrigin()
  const url = `${origin}/producto/${product.id}`
  const image = (product.imagenes ?? []).map((img) => absoluteUrl(img.url ?? img)).filter(Boolean)
  const basePrice = product.precioFinal ?? product.precio
  const description = plainText(product.descripcion, `${product.nombre} en Ampaz Studio.`)

  return {
    title: `${product.nombre} | Ampaz Studio`,
    description,
    canonical: url,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.nombre,
      description,
      image,
      sku: String(product.id),
      mpn: String(product.id),
      brand: product.marca ? { '@type': 'Brand', name: product.marca } : undefined,
      category: category?.nombre ?? product.subcategoria,
      url,
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'COP',
        price: String(basePrice),
        availability: productAvailability(product.stockTotal),
        itemCondition: 'https://schema.org/NewCondition',
      },
      // Solo si de verdad hay reseñas — Google rechaza/penaliza aggregateRating sin reviews
      // reales detrás (mismo criterio que ya usa la UI con "tieneResenas").
      ...(resenas?.totalResenas > 0 ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: String(resenas.ratingPromedio),
          reviewCount: String(resenas.totalResenas),
        },
      } : {}),
    },
  }
}

/* ── Reseñas ───────────────────────────────────────────── */

function Stars({ count, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size}
          className={n <= count ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

// Selector de estrellas clickeable — el rating es obligatorio para poder enviar la reseña
function StarsInput({ value, onChange, size = 22 }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star size={size}
            className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
        </button>
      ))}
    </div>
  )
}

function formatFecha(str) {
  if (!str) return ''
  // Backend manda "dd/MM/yyyy HH:mm" en zona Bogotá (ver JacksonConfig), no ISO — new Date(str)
  // directo da "Invalid Date" porque JS interpreta ese formato como MM/DD/YYYY.
  try {
    const [datePart, timePart] = str.split(' ')
    const [day, month, year] = datePart.split('/').map(Number)
    const [hour, minute] = (timePart ?? '0:0').split(':').map(Number)
    return new Date(year, month - 1, day, hour, minute)
      .toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return ''
  }
}

/* ══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════ */

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()
  const { isFavorito, toggle: toggleFavorito } = useWishlist()

  const [product, setProduct] = useState(null)
  const [category, setCategory] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [serviceDown, setServiceDown] = useState(false)

  // Variantes seleccionadas: { "Talla": "38", "Color": "Negro", ... }
  const [seleccionadas, setSeleccionadas] = useState({})
  const [cantidad, setCantidad] = useState(1)
  const [activeMedia, setActiveMedia] = useState(0)
  const [added, setAdded] = useState(false)
  const [adding, setAdding] = useState(false)
  // Mutex SINCRÓNICO (no basta con el estado `adding`, cuyo efecto no es inmediato en el
  // siguiente render): un doble clic en "Agregar al carrito" antes de que el botón se desactive
  // visualmente ya no dispara dos POST — el UPSERT del backend SUMA cantidades, así que dos
  // solicitudes agregarían el producto dos veces.
  const addMutexRef = useRef(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('caracteristicas')

  // Reseñas: resumen+lista (públicos) y estado del usuario autenticado (compró / ya reseñó)
  const [resenas, setResenas] = useState({ ratingPromedio: null, totalResenas: 0, items: [] })
  const [estadoResena, setEstadoResena] = useState({ compro: false, yaReseno: false })
  const [formCalificacion, setFormCalificacion] = useState(0)
  const [formComentario, setFormComentario] = useState('')
  const [enviandoResena, setEnviandoResena] = useState(false)
  const [errorResena, setErrorResena] = useState('')

  // Preguntas y respuestas
  const [preguntas, setPreguntas] = useState([])
  const [formPregunta, setFormPregunta] = useState('')
  const [enviandoPregunta, setEnviandoPregunta] = useState(false)
  const [errorPregunta, setErrorPregunta] = useState('')
  const [editandoPregId, setEditandoPregId] = useState(null)
  const [textoEditado, setTextoEditado] = useState('')

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setServiceDown(false)
    setProduct(null)
    setSeleccionadas({})
    setCantidad(1)
    setActiveMedia(0)
    setResenas({ ratingPromedio: null, totalResenas: 0, items: [] })
    setEstadoResena({ compro: false, yaReseno: false })
    setFormCalificacion(0)
    setFormComentario('')
    setErrorResena('')
    setPreguntas([])
    setFormPregunta('')
    setErrorPregunta('')
    setEditandoPregId(null)

    getProductById(id)
      .then(async (p) => {
        setProduct(p)
        initStockFromProduct(p)
        addReciente(p)
        registrarEvento('vista_producto', 'producto', p.id)
        const [cat, rel, res, preg] = await Promise.all([
          getCategoryById(p.categoriaId),
          getRelatedProducts(p.id, p.categoriaId, 4),
          getResenas(p.id),
          getPreguntas(p.id).catch(() => []),
        ])
        setCategory(cat)
        setRelated(rel)
        setResenas(res)
        setPreguntas(preg)
      })
      .catch((err) => {
        if (err?.offline) setServiceDown(true)
        else setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!product || !isAuthenticated) {
      setEstadoResena({ compro: false, yaReseno: false })
      return
    }
    getEstadoResena(product.id).then(setEstadoResena).catch(() => {})
  }, [product, isAuthenticated])

  const handleEnviarResena = async () => {
    if (!formCalificacion) {
      setErrorResena('Selecciona una calificación de estrellas')
      return
    }
    setEnviandoResena(true)
    setErrorResena('')
    try {
      await crearResena(product.id, { calificacion: formCalificacion, cuerpo: formComentario })
      setResenas(await getResenas(product.id))
      setEstadoResena((prev) => ({ ...prev, yaReseno: true }))
      setFormCalificacion(0)
      setFormComentario('')
    } catch {
      setErrorResena('No se pudo enviar tu reseña. Intenta de nuevo.')
    } finally {
      setEnviandoResena(false)
    }
  }

  const handleEnviarPregunta = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/producto/${id}` } })
      return
    }
    if (!formPregunta.trim()) {
      setErrorPregunta('Escribe tu pregunta')
      return
    }
    setEnviandoPregunta(true)
    setErrorPregunta('')
    try {
      const nueva = await crearPregunta(product.id, formPregunta.trim())
      setPreguntas((prev) => [nueva, ...prev])
      setFormPregunta('')
    } catch {
      setErrorPregunta('No se pudo enviar tu pregunta. Intenta de nuevo.')
    } finally {
      setEnviandoPregunta(false)
    }
  }

  const handleGuardarEdicionPregunta = async (pregId) => {
    if (!textoEditado.trim()) return
    try {
      await editarPregunta(product.id, pregId, textoEditado.trim())
      setPreguntas((prev) => prev.map((p) => (p.id === pregId ? { ...p, texto: textoEditado.trim(), editada: true } : p)))
      setEditandoPregId(null)
    } catch {
      setErrorPregunta('No se pudo guardar el cambio. Intenta de nuevo.')
    }
  }

  const handleEliminarPregunta = async (pregId) => {
    try {
      await eliminarPregunta(product.id, pregId)
      setPreguntas((prev) => prev.filter((p) => p.id !== pregId))
    } catch {
      setErrorPregunta('No se pudo eliminar la pregunta. Intenta de nuevo.')
    }
  }

  useEffect(() => {
    if (!product) return undefined

    const seo = productSeoData(product, category, resenas)
    document.title = seo.title
    setCanonical(seo.canonical)
    setMetaTag('description', seo.description)
    setMetaTag('og:title', seo.title, 'property')
    setMetaTag('og:description', seo.description, 'property')
    setMetaTag('og:type', 'product', 'property')
    setMetaTag('og:url', seo.canonical, 'property')
    if (seo.jsonLd.image?.[0]) setMetaTag('og:image', seo.jsonLd.image[0], 'property')
    upsertJsonLd('product-jsonld', seo.jsonLd)

    return () => removeJsonLd('product-jsonld')
  }, [product, category, resenas])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-3 min-h-[70vh] text-gray-400 text-sm">
        <Loader2 size={28} className="animate-spin" />
        Cargando producto…
      </div>
    )
  }

  if (serviceDown) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <p className="text-xl font-bold text-black">No pudimos conectar con el servidor</p>
        <p className="text-sm text-gray-500 mt-2">Verifica tu conexión e intenta de nuevo.</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-5 mx-auto">Reintentar</button>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <p className="text-xl font-bold text-black">Producto no encontrado</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-5 mx-auto">Ir al inicio</button>
      </div>
    )
  }

  const finalBase = product.precioFinal ?? product.precio
  const precioExtra = calcPrecioExtra(product, seleccionadas)
  const finalPrice = finalBase + precioExtra
  const stock = getStock(product.id, seleccionadas)
  const { ratingPromedio, totalResenas, items: listaResenas } = resenas
  const tieneResenas = totalResenas > 0
  const puedeResenar = isAuthenticated && estadoResena.compro && !estadoResena.yaReseno
  const caracteristicas = buildCaracteristicas(product, category)
  const variantes = product.variantes ?? []
  const requiredForStock = stockRequiredNames(product)

  const mediaItems = (() => {
    const imgs = (product.imagenes ?? []).slice(0, 5).map((img) => ({
      type: 'image', src: img.url ?? img, varId: img.varId ?? null,
    }))
    const video = product.video ? [{ type: 'video', src: product.video, varId: null }] : []
    return [...imgs, ...video]
  })()

  /* Seleccionar una opción de variante */
  const handleVariante = (varianteName, valor, opcion) => {
    setSeleccionadas((prev) => {
      const next = { ...prev, [varianteName]: valor }
      // Talla es la dimensión principal (requerida) y Color depende de ella: al cambiar
      // de talla, si el color ya elegido no existe para la nueva talla, se limpia — así
      // nunca queda una combinación inexistente ni se bloquea el cambio de talla.
      if (varianteName === 'Talla' && next.Color) {
        const comboStock = getStock(product.id, { Talla: valor, Color: next.Color })
        if (comboStock === 0) delete next.Color
      }
      return next
    })
    setError('')
    setCantidad(1)
    // Si se seleccionó un color y alguna imagen tiene varId, cambiar a la primera imagen de ese color
    if (varianteName === 'Color' && opcion?.varId) {
      const idx = mediaItems.findIndex((m) => m.varId === opcion.varId)
      if (idx !== -1) setActiveMedia(idx)
    }
  }

  /* Agregar al carrito */
  const handleAddToCart = async () => {
    if (addMutexRef.current) return
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/producto/${id}` } })
      return
    }

    for (const v of variantes) {
      if (v.requerido && !seleccionadas[v.nombre]) {
        setError(`Selecciona ${v.nombre.toLowerCase()} para continuar`)
        return
      }
    }
    for (const name of requiredForStock) {
      if (!seleccionadas[name]) {
        setError(`Selecciona ${name.toLowerCase()} para continuar`)
        return
      }
    }
    if (stock === 0) { setError('Producto agotado'); return }
    setError('')
    addMutexRef.current = true
    setAdding(true)
    try {
      await addToCart({
        productId: product.id,
        variantes: seleccionadas,
        cantidad,
      })
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch (err) {
      setError(err.message || 'No se pudo agregar al carrito')
    } finally {
      setAdding(false)
      addMutexRef.current = false
    }
  }

  const favorito = isFavorito(product.id)
  const handleFavorito = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/producto/${id}` } })
      return
    }
    toggleFavorito(product.id)
  }

  const waText = encodeURIComponent(
    `Hola, quiero pedir:\n*${product.nombre}*\n` +
    Object.entries(seleccionadas).map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\nPrecio: ${fmt(finalPrice)}` +
    `\n${siteOrigin()}/producto/${product.id}`
  )

  const allRequiredSelected = variantes
    .filter((v) => v.requerido)
    .every((v) => Boolean(seleccionadas[v.nombre]))
  const allStockOptionsSelected = requiredForStock.every((name) => Boolean(seleccionadas[name]))

  const maxCantidad = allRequiredSelected && allStockOptionsSelected ? Math.max(0, stock ?? 0) : 1

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 pb-16">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6 flex-wrap">
        <Link to="/" className="hover:text-black transition-colors">Inicio</Link>
        <ChevronRight size={11} />
        <Link to="/catalogo" className="hover:text-black transition-colors">Catálogo</Link>
        {category && (
          <>
            <ChevronRight size={11} />
            <Link to={`/catalogo?categoria=${category.id}`} className="hover:text-black transition-colors">
              {category.nombre}
            </Link>
          </>
        )}
        <ChevronRight size={11} />
        <span className="text-gray-700 font-medium line-clamp-1 max-w-xs">{product.nombre}</span>
      </nav>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

        {/* ── Galería ── */}
        {mediaItems.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-3">

            {/* Visor principal — el contenedor siempre mide igual (aspect-square);
                object-contain evita recortes, así ninguna imagen se ve más "grande" que otra */}
            <div className="order-1 lg:order-2 flex-1 bg-gray-50 overflow-hidden aspect-square">
              {mediaItems[activeMedia]?.type === 'video'
                ? (
                  <video
                    key={mediaItems[activeMedia].src}
                    src={mediaItems[activeMedia].src}
                    controls autoPlay loop playsInline
                    className="w-full h-full object-contain"
                  />
                )
                : (
                  <img
                    src={mediaItems[activeMedia]?.src ?? mediaItems[0].src}
                    alt={product.nombre}
                    className="w-full h-full object-contain transition-opacity duration-150"
                  />
                )
              }
            </div>

            {/* Miniaturas */}
            {mediaItems.length > 1 && (
              <div className="order-2 lg:order-1 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto no-scrollbar pb-0.5 lg:pb-0">
                {mediaItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveMedia(i)}
                    className={`flex-shrink-0 w-16 h-16 overflow-hidden border-2 transition-all ${
                      activeMedia === i ? 'border-black' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {item.type === 'video'
                      ? (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          <Play size={22} className="text-white" fill="white" />
                        </div>
                      )
                      : (
                        <img src={item.src} alt={`Vista ${i + 1}`} className="w-full h-full object-cover" />
                      )
                    }
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Info ── */}
        <div className="flex flex-col gap-5">

          {/* Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {product.etiquetas.includes('nuevo') && <span className="badge-new">Nuevo</span>}
              {product.descuento > 0 && <span className="badge-sale">-{product.descuento}% OFF</span>}
              {product.etiquetas.includes('mas-vendido') && <span className="badge-hot">Más vendido</span>}
            </div>
            <button
              onClick={handleFavorito}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-accent transition-colors flex-shrink-0"
            >
              <Heart size={16} className={favorito ? 'text-accent fill-accent' : ''} />
              {favorito ? 'En favoritos' : 'Agregar a favoritos'}
            </button>
          </div>

          {/* Marca + nombre + rating */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {product.marca} · {product.subcategoria}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-black leading-tight mt-1">
              {product.nombre}
            </h1>
            {tieneResenas && (
              <div className="flex items-center gap-2 mt-2">
                <Stars count={Math.round(ratingPromedio)} />
                <span className="text-xs text-gray-400">{ratingPromedio.toFixed(1)} · {totalResenas} reseñas</span>
              </div>
            )}
          </div>

          {/* Precio */}
          <div>
            {product.descuento > 0 ? (
              <>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-black text-accent">{fmt(finalPrice)}</span>
                  <span className="text-xl text-gray-400 line-through">{fmt(product.precio + precioExtra)}</span>
                  <span className="text-sm font-bold bg-accent text-white px-2 py-0.5 ">
                    -{product.descuento}% OFF
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ahorras <span className="font-semibold text-green-600">{fmt(product.precio - finalBase)}</span>
                </p>
              </>
            ) : (
              <span className="text-3xl font-black text-black">{fmt(finalPrice)}</span>
            )}
            {precioExtra > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">Incluye +{fmt(precioExtra)} por la opción seleccionada</p>
            )}
          </div>

          {/* ── Variantes dinámicas ── */}
          {variantes.map((variante) => {
            const selVal = seleccionadas[variante.nombre]
            return (
              <div key={variante.nombre}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-black">
                    {variante.nombre}{selVal ? `: ${selVal}` : ''}
                    {(variante.requerido || requiredForStock.includes(variante.nombre)) && !selVal && (
                      <span className="ml-1 text-[11px] font-normal text-gray-400">(requerido)</span>
                    )}
                  </p>
                  {variante.tipo === 'talla' && (
                    <button className="text-xs text-gray-400 hover:text-black transition-colors underline underline-offset-2">
                      Guía de tallas
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {variante.opciones.map((opcion) => {
                    const isSelected = selVal === opcion.valor
                    // Talla siempre usa su stock propio agregado (nunca se bloquea por color).
                    // Color, en cambio, se filtra por la talla ya elegida para mostrar solo
                    // los colores que realmente existen en esa talla (ej. 41 solo viene en Blanco).
                    // Sin talla elegida aún, se muestra el stock agregado del color.
                    const optionStock = variante.tipo === 'color' && seleccionadas.Talla
                      ? getStock(product.id, { Talla: seleccionadas.Talla, Color: opcion.valor }) ?? 0
                      : opcion.stock ?? 0
                    const isOut = optionStock === 0

                    if (variante.tipo === 'color') {
                      return (
                        <button
                          key={opcion.valor}
                          title={opcion.valor}
                          disabled={isOut}
                          onClick={() => handleVariante(variante.nombre, opcion.valor, opcion)}
                          className={`color-dot ${isSelected ? 'color-dot-active' : ''} ${isOut ? 'color-dot-disabled' : ''}`}
                          style={{ backgroundColor: opcion.hex }}
                        />
                      )
                    }

                    return (
                      <button
                        key={opcion.valor}
                        disabled={isOut}
                        onClick={() => handleVariante(variante.nombre, opcion.valor, opcion)}
                        className={`size-btn ${isSelected ? 'size-btn-active' : isOut ? 'size-btn-disabled' : ''}`}
                      >
                        {opcion.valor}
                        {opcion.precioExtra > 0 && !isOut && (
                          <span className="block text-[9px] leading-none text-green-600">
                            +{fmt(opcion.precioExtra)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

              </div>
            )
          })}

          {/* Stock global — solo si no hay variantes */}
          {stock !== null && (
            <div className={`flex items-center gap-1.5 text-sm font-medium ${
              stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-amber-600' : 'text-green-600'
            }`}>
              {stock === 0
                ? <><XCircle size={14} /> Agotado</>
                : stock <= 5
                ? <><AlertCircle size={14} /> Solo {stock} disponibles</>
                : <><PackageCheck size={14} /> {stock} unidades disponibles</>}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1 -mt-3">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          {/* Cantidad + Agregar al carrito */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center border-2 border-gray-200 overflow-hidden flex-shrink-0">
              <button onClick={() => setCantidad((q) => Math.max(1, q - 1))}
                className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm font-bold">{cantidad}</span>
              <button onClick={() => setCantidad((q) => Math.min(maxCantidad, q + 1))}
                disabled={!allRequiredSelected || !allStockOptionsSelected || cantidad >= maxCantidad}
                className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30">
                <Plus size={16} />
              </button>
            </div>

            <button onClick={handleAddToCart} disabled={adding}
              className={`flex-1 flex items-center justify-center gap-2 font-bold text-sm px-5 py-3 transition-all active:scale-95 disabled:opacity-60 ${
                added ? 'bg-accent-dark text-white' : 'bg-black text-white hover:bg-gray-800'
              }`}>
              {added
                ? <><Check size={18} /> Agregado</>
                : <><ShoppingBag size={18} /> Agregar al carrito</>}
            </button>
          </div>

          {/* WhatsApp */}
          <a href={`https://wa.me/573015097013?text=${waText}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border-2 border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Comprar por WhatsApp
          </a>

          {/* Beneficios */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { Icon: Truck, text: 'Envío a todo Colombia' },
             
              { Icon: Shield, text: 'Compra segura' },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex flex-col items-center text-center gap-1.5 p-3 bg-gray-50 ">
                <Icon size={18} className="text-black" />
                <p className="text-xs text-gray-600 leading-tight">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-12">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'caracteristicas', label: 'Características' },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'resenas', label: tieneResenas ? `Reseñas (${totalResenas})` : 'Reseñas' },
            { key: 'preguntas', label: preguntas.length ? `Preguntas (${preguntas.length})` : 'Preguntas' },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === t.key ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="py-6">
          {tab === 'caracteristicas' && (
            <div className="max-w-2xl">
              <div className="grid grid-cols-2 gap-x-4 sm:gap-x-10">
                {caracteristicas.map(([label, value], i) => (
                  <div key={label} className={`flex flex-col py-3 border-b border-gray-100 ${i < 3 ? 'sm:col-span-1' : ''}`}>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</span>
                    <span className="text-sm font-semibold text-black">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'descripcion' && (
            <div className="max-w-2xl">
              <p className="text-sm text-gray-700 leading-relaxed">
                {product.descripcion || 'Producto de alta calidad con materiales premium.'}
              </p>
            </div>
          )}

          {tab === 'resenas' && (
            <div className="max-w-2xl space-y-6">
              {tieneResenas ? (
                <>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-5xl font-black text-black">{ratingPromedio.toFixed(1)}</p>
                      <Stars count={Math.round(ratingPromedio)} size={16} />
                      <p className="text-xs text-gray-400 mt-1">{totalResenas} reseñas</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {resenas.distribucion.map(({ estrellas, porcentaje }) => (
                          <div key={estrellas} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-3">{estrellas}</span>
                            <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                            <div className="flex-1 h-1.5 bg-gray-100 overflow-hidden">
                              <div className="h-full bg-amber-400 " style={{ width: `${porcentaje}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 w-7">{porcentaje}%</span>
                          </div>
                      ))}
                    </div>
                  </div>
                  <hr className="border-gray-100" />
                  {listaResenas.map((r) => (
                    <div key={r.id}>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-8 h-8 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {r.autor?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-black">{r.autor}</p>
                          <Stars count={r.calificacion} size={11} />
                        </div>
                        <span className="ml-auto text-xs text-gray-400">{formatFecha(r.creadoEn)}</span>
                      </div>
                      {r.cuerpo && <p className="text-sm text-gray-600 ml-10">{r.cuerpo}</p>}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-gray-500">Este producto aún no tiene reseñas.</p>
              )}

              {puedeResenar && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="text-sm font-bold text-black mb-2">Compraste este producto — cuéntanos qué te pareció</p>
                    <StarsInput value={formCalificacion} onChange={setFormCalificacion} />
                    <textarea
                      value={formComentario}
                      onChange={(e) => setFormComentario(e.target.value)}
                      placeholder="Tu comentario (opcional)"
                      rows={3}
                      className="mt-3 w-full text-sm border-2 border-gray-200 px-3 py-2 focus:outline-none focus:border-black transition-colors resize-none"
                    />
                    {errorResena && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1.5">
                        <AlertCircle size={12} /> {errorResena}
                      </p>
                    )}
                    <button
                      onClick={handleEnviarResena}
                      disabled={enviandoResena}
                      className="mt-3 bg-black text-white font-bold text-sm px-5 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {enviandoResena ? 'Enviando…' : 'Enviar reseña'}
                    </button>
                  </div>
                </>
              )}

              {isAuthenticated && estadoResena.compro && estadoResena.yaReseno && (
                <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                  <Check size={13} /> Ya reseñaste este producto
                </p>
              )}
            </div>
          )}

          {tab === 'preguntas' && (
            <div className="max-w-2xl space-y-5">
              {preguntas.length === 0 ? (
                <p className="text-sm text-gray-500">Todavía no hay preguntas sobre este producto — sé el primero.</p>
              ) : (
                preguntas.map((p) => (
                  <div key={p.id} className="pb-4 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-8 h-8 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {p.autor?.[0] ?? '?'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-black">{p.autor}</p>
                        <p className="text-[11px] text-gray-400">
                          {formatFecha(p.creadoEn)}{p.editada ? ' · editada' : ''}
                        </p>
                      </div>
                    </div>

                    {editandoPregId === p.id ? (
                      <div className="ml-10">
                        <textarea
                          value={textoEditado}
                          onChange={(e) => setTextoEditado(e.target.value)}
                          rows={2}
                          className="w-full text-sm border-2 border-gray-200 px-3 py-2 focus:outline-none focus:border-black transition-colors resize-none"
                        />
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => handleGuardarEdicionPregunta(p.id)}
                            className="text-xs font-bold text-white bg-black px-3 py-1.5 hover:bg-gray-800 transition-colors">
                            Guardar
                          </button>
                          <button onClick={() => setEditandoPregId(null)}
                            className="text-xs font-semibold text-gray-500 hover:text-black px-3 py-1.5 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 ml-10">{p.texto}</p>
                    )}

                    {p.esMia && editandoPregId !== p.id && (
                      <div className="flex gap-3 ml-10 mt-1">
                        {/* Ya respondida: editar el texto original dejaría la respuesta de Ampaz Studio
                            desalineada con la pregunta que la originó, así que se deja de ofrecer. */}
                        {!p.respuestaTexto && (
                          <button
                            onClick={() => { setEditandoPregId(p.id); setTextoEditado(p.texto) }}
                            className="text-[11px] font-semibold text-gray-400 hover:text-black transition-colors"
                          >
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminarPregunta(p.id)}
                          className="text-[11px] font-semibold text-gray-400 hover:text-red-600 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}

                    {p.respuestaTexto ? (
                      <div className="ml-10 mt-2.5 pl-3 border-l-2 border-black">
                        <p className="text-[11px] font-bold text-black uppercase tracking-wide">Ampaz Studio responde</p>
                        <p className="text-sm text-gray-700 mt-0.5">{p.respuestaTexto}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 ml-10 mt-2">Esperando respuesta…</p>
                    )}
                  </div>
                ))
              )}

              <hr className="border-gray-100" />
              <div>
                <p className="text-sm font-bold text-black mb-2">¿Tienes una duda sobre este producto?</p>
                <textarea
                  value={formPregunta}
                  onChange={(e) => setFormPregunta(e.target.value)}
                  placeholder={isAuthenticated ? 'Escribe tu pregunta…' : 'Inicia sesión para preguntar'}
                  rows={2}
                  className="w-full text-sm border-2 border-gray-200 px-3 py-2 focus:outline-none focus:border-black transition-colors resize-none"
                />
                {errorPregunta && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1.5">
                    <AlertCircle size={12} /> {errorPregunta}
                  </p>
                )}
                <button
                  onClick={handleEnviarPregunta}
                  disabled={enviandoPregunta}
                  className="mt-3 bg-black text-white font-bold text-sm px-5 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {enviandoPregunta ? 'Enviando…' : isAuthenticated ? 'Enviar pregunta' : 'Iniciar sesión para preguntar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <section className="mt-10 pt-8 border-t border-gray-100">
          <h2 className="text-base font-black text-black mb-4">También te puede gustar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
