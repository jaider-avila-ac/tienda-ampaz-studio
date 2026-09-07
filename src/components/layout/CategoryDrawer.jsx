import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Home, Settings, Package, Bell, Heart } from 'lucide-react'
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

// ══════════════════════════════════════════════════════════════════════════
// Versión alterna del menú: mismos datos y misma navegación que antes
// (getActiveCategories, los mismos links de NAV_TOP/NAV_BOTTOM, las mismas
// rutas de categoría/subcategoría), pero como panel desplegable de ancho
// completo bajo el header — categorías y subcategorías visibles todas a la
// vez en una grilla, en vez del panel angosto de dos columnas que se abría
// desde la izquierda.
// ══════════════════════════════════════════════════════════════════════════
export default function CategoryDrawer({ isOpen, onClose }) {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    getActiveCategories().then(setCategories).catch(() => {})
  }, [])

  if (!isOpen) return null

  return (
    <>
      {/* Fondo oscuro */}
      <div className="fixed inset-0 bg-black/50 z-40 fade-in" onClick={onClose} />

      {/* Panel desplegable de ancho completo */}
      <div className="fixed left-0 right-0 top-[140px] z-50 dropdown-in">
        <div className="bg-white shadow-2xl max-h-[calc(100vh-140px)] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">

            {/* Accesos rápidos */}
            <div className="flex flex-wrap gap-2 mb-5">
              {NAV_TOP.map(({ label, to, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 pl-2.5 pr-3.5 py-1.5 text-xs font-medium text-gray-700 hover:border-accent hover:text-accent transition-colors"
                >
                  <Icon size={13} />
                  {label}
                </Link>
              ))}
              {NAV_BOTTOM.map(({ label, to, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 pl-2.5 pr-3.5 py-1.5 text-xs font-medium text-gray-500 hover:border-accent hover:text-accent transition-colors"
                >
                  <Icon size={13} />
                  {label}
                </Link>
              ))}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Categorías
            </p>

            {/* Grilla de categorías — cada tarjeta muestra sus subcategorías completas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
              {categories.map((cat) => (
                <div key={cat.id} className="rounded-2xl border border-gray-100 bg-aux/60 p-4">
                  <Link
                    to={`/catalogo?categoria=${cat.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 mb-2.5 group"
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <h3 className="text-sm font-black text-black group-hover:text-accent transition-colors">
                      {cat.nombre}
                    </h3>
                  </Link>

                  {cat.subcategorias.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subcategorias.map((sub) => (
                        <Link
                          key={sub}
                          to={`/catalogo?categoria=${cat.id}&subcategoria=${encodeURIComponent(sub)}`}
                          onClick={onClose}
                          className="rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-accent hover:text-accent transition-colors"
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
