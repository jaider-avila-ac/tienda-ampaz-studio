import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, ChevronDown } from 'lucide-react'
import { getProducts } from '../../../services/productService'
import ProductCard from '../../../components/ui/ProductCard'

const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevancia' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'descuento', label: 'Mayor descuento' },
  { value: 'nombre', label: 'Nombre A–Z' },
]

/* ── Panel de marcas (desktop) ──────────────────────────── */

function brandKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space, letter) => `${space}${letter.toUpperCase()}`)
}

function brandLabel(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function MarcasPanel({ marcas: disponibles, seleccionadas, onToggle, onClear }) {
  return (
    <aside className="w-[200px] flex-shrink-0 hidden sm:block">
      <div className="bg-white border border-gray-100 p-4 sticky top-24">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-black uppercase tracking-widest">Marcas</p>
          {seleccionadas.length > 0 && (
            <button onClick={onClear} className="text-[11px] text-gray-400 hover:text-black transition-colors">
              Limpiar
            </button>
          )}
        </div>
        <ul className="space-y-0.5">
          {disponibles.map(({ key, nombre, count }) => {
            const checked = seleccionadas.includes(key)
            return (
              <li key={key}>
                <label className="flex items-center justify-between gap-2 py-1.5 cursor-pointer group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-4 h-4 flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                      checked ? 'bg-black border-black' : 'border-gray-300 group-hover:border-gray-500'
                    }`}>
                      {checked && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" checked={checked} onChange={() => onToggle(key)} className="sr-only" />
                    <span className={`text-sm truncate transition-colors ${checked ? 'font-bold text-black' : 'text-gray-600 group-hover:text-black'}`}>
                      {nombre}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{count}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}

/* ══════════════════════════════════════════════════════════
   PÁGINA
═══════════════════════════════════════════════════════════ */

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allProducts, setAllProducts] = useState([])

  const query = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') ?? 'relevancia'
  const marcasParam = searchParams.get('marcas') ?? ''
  const marcasSel = useMemo(() => marcasParam.split(',').map(brandKey).filter(Boolean), [marcasParam])

  useEffect(() => {
    getProducts().then((data) => setAllProducts(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  /* Todos los productos que coinciden con la búsqueda (antes de filtrar por marca) */
  const baseResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allProducts.filter((p) =>
      p.activo && (
      p.nombre.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q) ||
      p.marca?.toLowerCase().includes(q) ||
      p.subcategoria?.toLowerCase().includes(q)
      )
    )
  }, [query, allProducts])

  /* Marcas disponibles con conteo */
  const marcasDisponibles = useMemo(() => {
    const counts = {}
    baseResults.forEach((p) => {
      const nombre = brandLabel(p.marca)
      const key = brandKey(nombre)
      if (!key) return
      counts[key] = counts[key] ?? { key, nombre, count: 0 }
      counts[key].count += 1
    })
    return Object.values(counts).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [baseResults])

  const marcasByKey = useMemo(
    () => Object.fromEntries(marcasDisponibles.map((m) => [m.key, m.nombre])),
    [marcasDisponibles]
  )

  /* Resultados finales: filtro de marca + orden */
  const results = useMemo(() => {
    let list = marcasSel.length > 0
      ? baseResults.filter((p) => marcasSel.includes(brandKey(p.marca)))
      : baseResults

    if (sort === 'precio-asc') list = [...list].sort((a, b) => a.precio - b.precio)
    else if (sort === 'precio-desc') list = [...list].sort((a, b) => b.precio - a.precio)
    else if (sort === 'nombre') list = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre))
    else if (sort === 'descuento') list = [...list].sort((a, b) => b.descuento - a.descuento)

    return list
  }, [baseResults, marcasSel, sort])

  /* Helpers */
  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }

  const toggleMarca = (marca) => {
    const key = brandKey(marca)
    const next = marcasSel.includes(key)
      ? marcasSel.filter((m) => m !== key)
      : [...marcasSel, key]
    setParam('marcas', next.join(','))
  }

  const showMarcas = marcasDisponibles.length >= 1

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">

      {/* Sin query */}
      {!query && (
        <div className="text-center py-20">
          <Search size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="text-base font-bold text-black">¿Qué estás buscando?</p>
          <p className="text-sm text-gray-400 mt-1">Escribe en la barra para encontrar productos</p>
        </div>
      )}

      {query && (
        <>
          {/* Título */}
          <div className="mb-4">
            <h1 className="text-xl font-black text-black">
              Resultados para <span className="text-gray-500">"{query}"</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {baseResults.length} {baseResults.length === 1 ? 'producto encontrado' : 'productos encontrados'}
            </p>
          </div>

          {/* Chips de marcas en móvil */}
          {showMarcas && (
            <div className="sm:hidden mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {marcasDisponibles.map(({ key, nombre, count }) => {
                const active = marcasSel.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleMarca(key)}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold border transition-all ${
                      active ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black'
                    }`}
                  >
                    {nombre} <span className="opacity-60">({count})</span>
                  </button>
                )
              })}
              {marcasSel.length > 0 && (
                <button
                  onClick={() => setParam('marcas', '')}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-500 transition-all"
                >
                  <X size={10} /> Limpiar
                </button>
              )}
            </div>
          )}

          {/* Controles sort */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-black">{results.length}</span> resultado{results.length !== 1 ? 's' : ''}
              {marcasSel.length > 0 && <span className="text-gray-400"> · {marcasSel.join(', ')}</span>}
            </p>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setParam('sort', e.target.value)}
                className="appearance-none bg-white border border-gray-200 pl-3 pr-8 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Layout: panel marcas + grid */}
          <div className={showMarcas ? 'flex gap-6' : ''}>

            {showMarcas && (
              <MarcasPanel
                marcas={marcasDisponibles}
                seleccionadas={marcasSel}
                onToggle={toggleMarca}
                onClear={() => setParam('marcas', '')}
              />
            )}

            <div className="flex-1 min-w-0">
              {results.length === 0 ? (
                <div className="text-center py-20">
                  <Search size={40} className="text-gray-200 mx-auto mb-4" />
                  <p className="text-base font-bold text-black">Sin resultados para esta selección</p>
                  <button
                    onClick={() => setParam('marcas', '')}
                    className="mt-4 text-sm font-semibold text-black underline underline-offset-2"
                  >
                    Quitar filtro de marcas
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {results.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
