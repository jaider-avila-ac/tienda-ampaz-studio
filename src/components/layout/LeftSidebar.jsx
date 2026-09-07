import { useState, useEffect } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, X, SlidersHorizontal } from 'lucide-react'
import { getActiveCategories } from '../../services/categoryService'

const GENEROS = [
  { value: 'mujer', label: 'Mujer' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'niños', label: 'Niños' },
  { value: 'unisex', label: 'Unisex' },
]

export default function LeftSidebar({ onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [expandedCat, setExpandedCat] = useState(
    params.get('categoria') ? Number(params.get('categoria')) : null
  )

  useEffect(() => {
    getActiveCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const activeCatId = params.get('categoria') ? Number(params.get('categoria')) : null
  const activeSub = params.get('subcategoria') ?? ''
  const activeGen = params.get('genero') ?? ''
  const isCatalog = location.pathname.startsWith('/catalogo')

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next)
    onClose?.()
  }

  const openCategory = (catId) => {
    navigate(`/catalogo?categoria=${catId}`)
    onClose?.()
  }

  const openSubcategory = (catId, sub) => {
    navigate(`/catalogo?categoria=${catId}&subcategoria=${encodeURIComponent(sub)}`)
    onClose?.()
  }

  const toggleCat = (catId) => {
    setExpandedCat((prev) => (prev === catId ? null : catId))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header (solo en drawer móvil) */}
      {onClose && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-bold text-black">Menú</span>
          <button onClick={onClose} className="p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="overflow-y-auto flex-1 py-3 px-2">

        {/* ── CATEGORÍAS ───────────────── */}
        <p className="sidebar-label">Categorías</p>

        {/* "Todos" */}
        <Link
          to="/catalogo"
          onClick={onClose}
          className={`left-nav-item ${!activeCatId && isCatalog ? 'left-nav-item-active' : ''}`}
        >
          <span className="text-base">🏬</span>
          <span>Todo el catálogo</span>
        </Link>

        {categories.map((cat) => {
          const isActive = activeCatId === cat.id
          const isExpanded = expandedCat === cat.id

          return (
            <div key={cat.id}>
              {/* Fila de categoría */}
              <div
                className={`left-nav-item ${isActive ? 'left-nav-item-active' : ''}`}
                onClick={() => {
                  toggleCat(cat.id)
                  if (!isActive) openCategory(cat.id)
                }}
              >
                <span className="flex-1">{cat.nombre}</span>
                {cat.subcategorias.length > 0 && (
                  isExpanded
                    ? <ChevronDown size={14} className="flex-shrink-0" />
                    : <ChevronRight size={14} className="flex-shrink-0" />
                )}
              </div>

              {/* Subcategorías */}
              {(isExpanded || isActive) && cat.subcategorias.map((sub) => (
                <button
                  key={sub}
                  onClick={() => {
                    if (activeSub === sub) openCategory(cat.id)
                    else openSubcategory(cat.id, sub)
                  }}
                  className={`left-nav-sub w-full text-left ${activeSub === sub ? 'left-nav-sub-active' : ''}`}
                >
                  {activeSub === sub && <span className="w-1 h-1 bg-black inline-block mr-1" />}
                  {sub}
                </button>
              ))}
            </div>
          )
        })}

        {/* ── FILTROS (solo en catálogo) ── */}
        {isCatalog && (
          <>
            <div className="border-t border-gray-100 my-3" />
            <p className="sidebar-label flex items-center gap-1.5">
              <SlidersHorizontal size={11} /> Filtros
            </p>

            {/* Género */}
            <p className="text-xs font-semibold text-gray-600 px-3 mb-1.5 mt-2">Para</p>
            <div className="flex flex-wrap gap-1.5 px-3 mb-3">
              {GENEROS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setFilter('genero', activeGen === g.value ? '' : g.value)}
                  className={`text-xs px-2.5 py-1 border font-medium transition-all ${
                    activeGen === g.value
                      ? 'bg-black text-white border-black'
                      : 'border-gray-200 text-gray-600 hover:border-black'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Limpiar filtros */}
            {(activeCatId || activeSub || activeGen) && (
              <button
                onClick={() => { setParams({}); onClose?.() }}
                className="w-full text-xs text-red-500 hover:text-red-700 text-center py-2 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
