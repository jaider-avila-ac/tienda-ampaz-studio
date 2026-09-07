import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, RefreshCw, Shield } from 'lucide-react'
import { getTiendaConfig } from '../../../services/tiendaConfigService'
import { fmt } from '../../../utils/format'

export default function HeroBanner() {
  const [freeShip, setFreeShip] = useState({ modo: 'contra_entrega', activo: true, desde: 200000 })

  useEffect(() => {
    let alive = true
    getTiendaConfig().then((cfg) => {
      if (!alive) return
      setFreeShip({
        modo: cfg?.envio_modo === 'fijo' ? 'fijo' : 'contra_entrega',
        activo: cfg?.envio_gratis_activo ?? true,
        desde: cfg?.envio_gratis_desde ?? 200000,
      })
    })
    return () => { alive = false }
  }, [])

  const envioText = freeShip.modo === 'contra_entrega'
    ? 'Envío contra entrega a todo Colombia'
    : freeShip.activo
      ? `Envío gratis en compras +${fmt(freeShip.desde)}`
      : 'Envío rápido a todo Colombia'

  return (
    <>
      {/* Main hero */}
      <section className="relative bg-black overflow-hidden min-h-[80vh] md:min-h-[85vh] flex items-center">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1400&q=80"
            alt="Hero"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        </div>

        <div className="container-main relative z-10 py-16 md:py-24">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-accent text-white text-xs font-bold px-3 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 bg-black animate-pulse" />
              Nueva colección 2025
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight">
              Tu estilo,<br />
              <span className="text-accent">tu identidad</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-gray-300 leading-relaxed max-w-md">
              Descubre calzado y ropa de moda para toda la familia. Más de 200 referencias disponibles con envío a todo Colombia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalogo" className="btn-lime text-base px-6 py-3.5 font-bold">
                Ver colección <ArrowRight size={18} />
              </Link>
              <Link to="/catalogo?descuento=true" className="btn-secondary border-white text-white hover:bg-white hover:text-black px-6 py-3.5 ">
                Ver ofertas
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50">
          <div className="w-0.5 h-8 bg-white animate-bounce" />
        </div>
      </section>

      {/* Benefits strip */}
      <div className="bg-accent">
        <div className="container-main py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/20">
            {[
              { icon: Truck, text: envioText },
              { icon: RefreshCw, text: 'Devoluciones en 5 días hábiles' },
              { icon: Shield, text: 'Compra segura 100% garantizada' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center justify-center gap-2 py-2.5 sm:py-2 text-center sm:text-left">
                <Icon size={15} className="text-white flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-white">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
