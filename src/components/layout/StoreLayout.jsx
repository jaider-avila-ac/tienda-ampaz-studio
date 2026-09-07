import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function StoreLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-aux">
      <Navbar />
      {/* key en pathname para que la animación se dispare al cambiar de ruta (no en filtros) */}
      {/* móvil: fila1(56px) + fila2(44px) = 100px | desktop: fila única 72px */}
      <main className="pt-[100px] lg:pt-[72px] max-w-[1920px] w-full mx-auto">
        <div key={pathname} className="page-in">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
