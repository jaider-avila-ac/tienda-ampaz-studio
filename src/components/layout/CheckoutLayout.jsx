import { Outlet, Link } from 'react-router-dom'
import { Layers, ArrowLeft } from 'lucide-react'

export default function CheckoutLayout() {
  return (
    <div className="min-h-screen bg-aux">
      {/* Header simplificado */}
      <header className="bg-black h-14 flex items-center px-4 gap-4">
        <Link to="/" className="flex items-center gap-1.5">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <Layers size={14} className="text-black" />
          </div>
          <div className="leading-none hidden sm:block">
            <span className="font-black text-white text-sm">CALZA</span>
            <span className="font-black text-accent text-sm">CARIBE</span>
          </div>
        </Link>

        <div className="flex-1 text-center">
          <span className="text-white text-sm font-semibold">Finalizar compra</span>
        </div>

        <Link to="/" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors">
          <ArrowLeft size={14} /> Seguir comprando
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
