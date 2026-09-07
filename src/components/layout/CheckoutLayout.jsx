import { Outlet, Link } from 'react-router-dom'
import { Layers, ArrowLeft } from 'lucide-react'

export default function CheckoutLayout() {
  return (
    <div className="min-h-screen bg-aux">
      {/* Header simplificado */}
      <header className="bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-4">
        <Link to="/" className="flex items-center gap-1.5">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <Layers size={14} className="text-white" />
          </div>
          <div className="leading-none hidden sm:block">
            <span className="font-black text-black text-sm">AMPAZ</span>
            <span className="font-black text-accent text-sm"> STUDIO</span>
          </div>
        </Link>

        <div className="flex-1 text-center">
          <span className="text-black text-sm font-semibold">Finalizar compra</span>
        </div>

        <Link to="/" className="flex items-center gap-1.5 text-gray-500 hover:text-accent text-xs transition-colors">
          <ArrowLeft size={14} /> Seguir comprando
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
