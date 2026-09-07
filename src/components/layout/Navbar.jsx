import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Bell, CircleUserRound, Menu as MenuIcon } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationsContext'
import CategoryDrawer from './CategoryDrawer'

// ══════════════════════════════════════════════════════════════════════════
// Versión alterna del header: misma data/funciones que la original (mismo
// estado de búsqueda, mismos conteos de carrito/notificaciones, mismos
// links), pero con otra forma — logo centrado y una fila de búsqueda propia,
// en vez de barra única con logo a la izquierda. Alto total unificado
// (112px) para mobile y desktop — ver StoreLayout.jsx.
// ══════════════════════════════════════════════════════════════════════════
export default function Navbar() {
  const { count } = useCart()
  const { isAuthenticated, user } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const firstName = user?.nombre?.trim() || user?.email?.split('@')[0] || ''
  const fullName = [user?.nombre, user?.apellido].filter(Boolean).join(' ').trim()

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/busqueda?q=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50">

        {/* Fila principal — hamburguesa | logo centrado | iconos */}
        <div className="h-16 bg-white border-b border-gray-100">
          <div className="h-full max-w-7xl mx-auto px-4 lg:px-6 grid grid-cols-[auto_1fr_auto] items-center gap-2">

            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className={`w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0 ${
                drawerOpen ? 'bg-accent text-white' : 'text-black hover:bg-aux'
              }`}
              aria-label="Menú"
            >
              <MenuIcon size={19} />
            </button>

            <Link to="/" className="flex items-center justify-center">
              <img src="/logos/imagotico-ampaz-studio.svg" alt="Ampaz Studio" className="h-6 sm:h-7" style={{ filter: 'invert(1)' }} />
            </Link>

            <div className="flex items-center gap-0.5 sm:gap-1 justify-self-end">
              <Link
                to="/notificaciones"
                className="relative w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-aux hover:text-black transition-colors"
                aria-label="Notificaciones"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[15px] h-[15px] bg-red-600 text-white text-[9px] font-black flex items-center justify-center px-0.5 border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to={isAuthenticated ? '/configuracion' : '/login'}
                className="hidden sm:flex w-10 h-10 items-center justify-center text-gray-500 hover:bg-aux hover:text-black transition-colors"
                aria-label={isAuthenticated ? fullName || firstName : 'Iniciar sesión'}
                title={isAuthenticated ? fullName || firstName : 'Iniciar sesión'}
              >
                <CircleUserRound size={19} />
              </Link>

              <Link
                to="/carrito"
                className="relative w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-aux hover:text-black transition-colors"
              >
                <ShoppingCart size={19} />
                {count > 0 && (
                  <span className="absolute top-1 right-1 min-w-[15px] h-[15px] bg-accent text-white text-[9px] font-black flex items-center justify-center px-0.5 border-2 border-white">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Fila de búsqueda — un solo diseño para cualquier tamaño de pantalla */}
        <div className="h-12 bg-aux border-b border-gray-100 flex items-center px-4 lg:px-6">
          <form onSubmit={handleSearch} className="relative w-full max-w-3xl mx-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos, marcas, categorías..."
              className="w-full h-9 bg-white border border-gray-200 pl-4 pr-11 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-accent transition"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-white bg-accent hover:bg-accent-dark transition-colors"
            >
              <Search size={13} />
            </button>
          </form>
        </div>
      </div>

      {/* Menú de categorías */}
      <CategoryDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
