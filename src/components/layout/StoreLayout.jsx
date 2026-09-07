import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function StoreLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-aux">
      <Navbar />
      {/* key en pathname para que la animación se dispare al cambiar de ruta (no en filtros) */}
      {/* Header unificado: franja(28px) + fila principal(64px) + búsqueda(48px) = 140px,
          igual en mobile y desktop (antes había una altura distinta por breakpoint). */}
      <main className="pt-[140px] max-w-[1920px] w-full mx-auto">
        <div key={pathname} className="page-in">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
