import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronRight, ArrowRight, Home, ShoppingBag, Settings, Package, Bell, Heart } from 'lucide-react'
import { getActiveCategories } from '../../services/categoryService'

const NAV_TOP = [
  { label: 'Inicio', to: '/', Icon: Home },
  { label: 'Mis compras', to: '/mis-compras', Icon: Package },
  { label: 'Favoritos', to: '/favoritos', Icon: Heart },
  { label: 'Notificaciones', to: '/notificaciones', Icon: Bell },
]

const NAV_BOTTOM = [
  { label: 'Configuración', to: '/configuracion', Icon: Settings },
]

export default function CategoryDrawer({ isOpen, onClose }) {
  const [categories, setCategories] = useState([])
  const [hoveredCat, setHoveredCat] = useState(null)

  useEffect(() => {
    getActiveCategories().then((data) => {
      setCategories(data)
      setHoveredCat(data[0]?.id ?? null)
    }).catch(() => {})
  }, [])

  if (!isOpen) return null

  const activeCategory = categories.find((c) => c.id === hoveredCat)

  return (
    <>
      {/* Fondo oscuro */}
      <div className="fixed inset-0 bg-black/50 z-40 fade-in" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed left-0 top-[100px] lg:top-[72px] bottom-0 z-50 flex drawer-in">

        {/* Panel izquierdo */}
        <div className="w-60 sm:w-64 bg-white h-full flex flex-col shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <span className="text-sm font-black text-black">Menú</span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 transition-colors text-gray-500 hover:text-black"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navegación superior */}
          <div className="px-2 pt-2 pb-1">
            {NAV_TOP.map(({ label, to, Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
              >
                <Icon size={16} className="text-gray-400 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>

          {/* Label categorías */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Categorías
            </p>
          </div>

          {/* Lista de categorías */}
          <ul className="flex-1 overflow-y-auto px-2 pb-1">
            {categories.map((cat) => (
              <li key={cat.id}>
                <div
                  onMouseEnter={() => setHoveredCat(cat.id)}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                    hoveredCat === cat.id
                      ? 'bg-gray-50 font-semibold text-black'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <Link
                    to={`/catalogo?categoria=${cat.id}`}
                    onClick={onClose}
                    className="flex-1 text-sm"
                  >
                    {cat.nombre}
                  </Link>
                  {cat.subcategorias.length > 0 && (
                    <ChevronRight
                      size={14}
                      className={`flex-shrink-0 transition-colors ${
                        hoveredCat === cat.id ? 'text-black' : 'text-gray-300'
                      }`}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Configuración al fondo */}
          <div className="border-t border-gray-100 px-2 py-2">
            {NAV_BOTTOM.map(({ label, to, Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
              >
                <Icon size={16} className="text-gray-400 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Panel derecho: subcategorías */}
        {activeCategory && activeCategory.subcategorias.length > 0 && (
          <div className="w-56 sm:w-72 bg-white h-full border-l border-gray-100 flex flex-col shadow-xl fade-in">

            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">
                Categoría
              </p>
              <h3 className="text-base font-black text-black">{activeCategory.nombre}</h3>
            </div>

            <ul className="flex-1 overflow-y-auto p-3">
              {activeCategory.subcategorias.map((sub) => (
                <li key={sub}>
                  <Link
                    to={`/catalogo?categoria=${activeCategory.id}&subcategoria=${encodeURIComponent(sub)}`}
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                  >
                    <span className="w-1 h-1 bg-gray-300 flex-shrink-0" />
                    {sub}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-100 px-5 py-3">
              <Link
                to={`/catalogo?categoria=${activeCategory.id}`}
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
              >
                Ver todo en {activeCategory.nombre} <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
