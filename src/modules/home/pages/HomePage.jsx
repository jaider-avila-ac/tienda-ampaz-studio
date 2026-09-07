import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, RefreshCw, Shield, Flame, Sparkles, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import ProductCard from '../../../components/ui/ProductCard'
import { getProducts, subscribeProducts } from '../../../services/productService'
import { getActiveCategories } from '../../../services/categoryService'
import { getRecientes, getCategoriaFavorita, pruneRecientes } from '../../../services/recentService'
import { getRecientesDB, getCategoriaFavoritaDB } from '../../../services/eventoService'
import { tokenStore } from '../../../services/tokenStore'
import { getBanners } from '../../../services/bannerService'
import { useBackendOnline } from '../../../hooks/useBackendOnline'
import CollectionsGrid from '../components/CollectionsGrid'

/** Tira de "Explora nuestro catálogo": solo se duplica y anima cuando UN solo set de productos
 *  ya desborda el ancho visible del contenedor — en ese caso, las dos copias de un mismo
 *  producto siempre quedan separadas por más de un ancho de pantalla, así que nunca se puede
 *  ver el mismo producto dos veces al mismo tiempo, sin importar en qué punto vaya el scroll.
 *  Con pocos productos (un solo set ya cabe completo en pantalla) no se duplica nada — se
 *  muestra una sola vez, estática, sin animación. */
function ProductMarquee({ products }) {
  const containerRef = useRef(null)
  const measureRef = useRef(null)
  const [shouldLoop, setShouldLoop] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    // measureRef siempre contiene UN solo set (nunca duplicado, invisible, fuera del flujo) —
    // si ya desborda el contenedor visible, hay contenido de sobra para que el loop se vea
    // continuo; si no, se muestra tal cual, sin animación.
    const check = () => setShouldLoop(measure.scrollWidth > container.clientWidth)
    check()

    const ro = new ResizeObserver(check)
    ro.observe(container)
    ro.observe(measure)
    return () => ro.disconnect()
  }, [products])

  const visibles = shouldLoop ? [...products, ...products] : products

  return (
    <div ref={containerRef} className="overflow-hidden relative">
      <div ref={measureRef} className="invisible absolute left-0 top-0 flex gap-3 w-max px-4 pointer-events-none" aria-hidden>
        {products.map((p) => (
          <div key={p.id} className="w-36 sm:w-48 flex-shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      <div className={`flex gap-3 w-max px-4 ${shouldLoop ? 'marquee-track' : ''}`}>
        {visibles.map((p, i) => (
          <div key={`${p.id}-${i}`} className="w-36 sm:w-48 flex-shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  )
}

function BannerHero({ banners }) {
  const slides = banners
  const [current, setCurrent] = useState(0)
  const timerRef = useRef(null)

  const startTimer = () => {
    clearInterval(timerRef.current)
    if (slides.length <= 1) return
    timerRef.current = setInterval(() => {
      setCurrent((i) => (i + 1) % slides.length)
    }, 4500)
  }

  useEffect(() => {
    setCurrent(0)
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [slides.length])

  if (slides.length === 0) return null

  const go = (idx) => { setCurrent(idx); startTimer() }
  const prev = () => go((current - 1 + slides.length) % slides.length)
  const next = () => go((current + 1) % slides.length)

  return (
    <div className="relative w-full overflow-hidden aspect-[16/6]">
      {slides.map(({ tipo, url, ctaLink }, i) => {
        const offset = (i - current + slides.length) % slides.length
        const x = offset === 0 ? 0 : offset === slides.length - 1 ? -100 : 100

        const mediaEl = tipo === 'video' ? (
          <video src={url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
        )

        // Enlace externo (http/https/wa.me/etc) → <a target="_blank">
        // Enlace interno (empieza con /) → <Link>
        const isExternal = ctaLink && /^https?:\/\//i.test(ctaLink)
        const wrapped = ctaLink
          ? isExternal
            ? <a href={ctaLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full">{mediaEl}</a>
            : <Link to={ctaLink} className="block w-full h-full">{mediaEl}</Link>
          : mediaEl

        return (
          <div key={i} className="absolute inset-0 transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(${x}%)` }}>
            {wrapped}
          </div>
        )
      })}

      {slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 bg-black/40 hover:bg-black/65 backdrop-blur-sm flex items-center justify-center text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={next} aria-label="Siguiente"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 bg-black/40 hover:bg-black/65 backdrop-blur-sm flex items-center justify-center text-white transition-colors">
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Ir al banner ${i + 1}`}
                className={`transition-all duration-300 ${
                  i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [recientes, setRecientes] = useState([])
  const [catFavorita, setCatFavorita] = useState(null)
  const [heroBanners, setHeroBanners] = useState([])
  const [heroLoading, setHeroLoading] = useState(true)
  const backendOnline = useBackendOnline()
  // true mientras "recientes" venga de getRecientesDB (ya validado en el servidor, en vivo) —
  // así el efecto de abajo no lo pisa con la versión podada localmente, que es solo el fallback.
  const recientesDeDbRef = useRef(false)

  useEffect(() => {
    // Si el refresco en segundo plano trae datos nuevos, se reflejan solos sin recargar.
    const unsubscribe = subscribeProducts((data) => setProducts(Array.isArray(data) ? data : []))

    getProducts().then((data) => {
      setProducts(Array.isArray(data) ? data : [])
    }).catch(() => {})

    getActiveCategories().then(setCategories).catch(() => {})
    getBanners('hero').then(setHeroBanners).catch(() => {}).finally(() => setHeroLoading(false))

    if (tokenStore.isLoggedIn()) {
      getRecientesDB(8).then((dbData) => {
        if (Array.isArray(dbData) && dbData.length > 0) {
          recientesDeDbRef.current = true
          setRecientes(dbData)
        }
      })
      getCategoriaFavoritaDB().then((catFav) => {
        setCatFavorita(catFav || getCategoriaFavorita())
      })
    } else {
      setCatFavorita(getCategoriaFavorita())
    }

    return unsubscribe
  }, [])

  // "products" llega primero desde el caché local (localStorage, puede estar desactualizado) y
  // luego otra vez con el catálogo fresco del servidor (refresco en 2do plano, vía
  // subscribeProducts) — antes esta poda solo corría una vez con la primera versión, así que un
  // producto borrado/desactivado después de haberse visto quedaba "fantasma" en Vistos
  // recientemente hasta que se refrescaba la página. Recalcular cada vez que products cambia
  // cubre ambas pasadas (caché vieja y catálogo fresco) sin ese hueco.
  useEffect(() => {
    if (!products.length || recientesDeDbRef.current) return
    const validIds = new Set(products.filter((p) => p.activo).map((p) => p.id))
    setRecientes(pruneRecientes(validIds).slice(0, 8))
  }, [products])

  // Si el backend no responde, no hay forma de confirmar que el caché local sigue vigente
  // (productos pudieron cambiar de precio/stock/estado) — mejor no mostrar nada a mostrar
  // datos posiblemente desactualizados como si fueran en vivo.
  const activeProducts = backendOnline ? products.filter((p) => p.activo) : []
  const vendidos = activeProducts.filter((p) => p.etiquetas.includes('mas-vendido')).slice(0, 4)
  const nuevos = activeProducts.filter((p) => p.etiquetas.includes('nuevo')).slice(0, 4)
  // Tira con movimiento constante: no depende de ninguna etiqueta, así siempre hay contenido
  // que mostrar aunque no existan productos marcados "mas-vendido".
  const destacados = activeProducts.slice(0, 10)

  // Categoría favorita al frente; el resto en su orden original
  const sortedCategories = useMemo(() => {
    if (!catFavorita) return categories
    return [...categories].sort((a, b) => {
      if (a.id === catFavorita.id) return -1
      if (b.id === catFavorita.id) return 1
      return 0
    })
  }, [categories, catFavorita])

  if (heroLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[70vh] text-gray-400 text-sm">
        <Loader2 size={28} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-16">

      {/* ── Hero ── */}
      <BannerHero banners={heroBanners} />

      {!backendOnline && (
        <div className="max-w-7xl mx-auto px-4 pt-10">
          <p className="text-sm text-gray-500 text-center bg-gray-50 py-4">
            No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.
          </p>
        </div>
      )}

      {/* ── Destacados: tira con movimiento constante (no depende de etiquetas) ── */}
      {destacados.length > 0 && (
        <section className="pt-10">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-black">
              Explora nuestro catálogo
            </h2>
            <Link to="/catalogo"
              className="text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <ProductMarquee products={destacados} />
        </section>
      )}

      {/* ── Más vendidos ── */}
      {vendidos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-base font-black text-black">
              <Flame size={16} className="text-red-500" />
              Más vendidos
            </h2>
            <Link to="/catalogo"
              className="text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {vendidos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── Colecciones — lejos del hero y del carrusel de productos ── */}
      <CollectionsGrid />

      {/* ── Secciones por categoría (ordenadas por actividad del usuario) ── */}
      {sortedCategories.map((cat) => {
        const productos = activeProducts.filter((p) => p.categoriaId === cat.id).slice(0, 4)
        if (productos.length === 0) return null
        return (
          <section key={cat.id} className="max-w-7xl mx-auto px-4 pt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-black">{cat.nombre}</h2>
              <Link to={`/catalogo?categoria=${cat.id}`}
                className="text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1">
                Ver todo <ArrowRight size={12} />
              </Link>
            </div>
            {cat.subcategorias.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-0.5">
                {cat.subcategorias.map((sub) => (
                  <Link key={sub}
                    to={`/catalogo?categoria=${cat.id}&subcategoria=${encodeURIComponent(sub)}`}
                    className="flex-shrink-0 text-[11px] font-medium text-gray-500 hover:text-black border border-gray-200 hover:border-black px-2.5 py-1 transition-colors">
                    {sub}
                  </Link>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {productos.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )
      })}


      {/* ── Nuevos ingresos ── */}
      {nuevos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-base font-black text-black">
              <Sparkles size={16} className="text-violet-600" />
              Nuevos ingresos
            </h2>
            <Link to="/catalogo?etiqueta=nuevo"
              className="text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {nuevos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── Vistos recientemente ── */}
      {recientes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-base font-black text-black">
              <Clock size={16} className="text-gray-500" />
              Vistos recientemente
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recientes.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── CTA WhatsApp ── */}
      <div className="max-w-7xl mx-auto px-4 pt-10">
        <div className="bg-accent p-6 text-center">
          <h3 className="text-lg font-black text-white">¿Dudas sobre tallas o colores?</h3>
          <p className="text-sm text-white/70 mt-1 mb-4">Escríbenos y te asesoramos al instante</p>
          <a href="https://wa.me/573015097013?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20sus%20productos"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 font-bold text-sm hover:bg-gray-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chatear ahora
          </a>
        </div>
      </div>
    </div>
  )
}
